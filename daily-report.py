#!/usr/bin/python2.6
#-*- coding: UTF-8 -*-

import sys, time, os, json, traceback, datetime, urllib, random, traceback;
import cherrypy, MySQLdb;

# set the default encoding to utf-8
# reload sys model to enable the getdefaultencoding method.
reload(sys);
# using exec to set the encoding, to avoid error in IDE.
exec("sys.setdefaultencoding('utf-8')");
assert sys.getdefaultencoding().lower() == "utf-8";

from utility import error, trace, get_work_dir, reload_config, send_mail, enable_crossdomain, sql_exec, utility_init;
from auth import SESSION_KEY, authorize_get_exception_user_id, authorize_user, check_auth, crossdomain_session, require_auth, require_admin, auth_init;

version="2.0.5"

class ErrorCode:
    Success = 0x00;
    Failed = 0x100;
    # authenticated, but not associated with local system.
    NotAssociated = 0x200;
    
class RESTAuth(object):
    exposed = True;
    
    def qq_oauth_query_available_associate_user(self, access_token, qq_oauth_openid):
        # query all un-associated users.
        users = [];
        records = sql_exec(
            "select user_id,user_name from dr_user where "
                "user_id not in (select user_id from dr_authenticate) "
                "and enabled=true");
        for record in records:
            users.append({"id":record["user_id"], "value":record["user_name"]});
        return json.dumps({"code":ErrorCode.NotAssociated, "error":ErrorCode.NotAssociated,
            "access_token":access_token, "qq_oauth_openid":qq_oauth_openid, "users":users, 
            "error_description":"user not found, please associate one"});
            
    def qq_oauth_get_associated(self, qq_oauth_openid):
        return sql_exec("select u.user_id,u.user_name from dr_user u, dr_authenticate a "
            "where u.enabled=true and u.user_id=a.user_id and a.qq_oauth_openid=%s", (qq_oauth_openid));
            
    def qq_oauth_auto_register(self, access_token, qq_oauth_openid):
        auth = _config["auth"];
        
        # https://graph.qq.com/user/get_user_info?access_token=71871H1H3187I31EQJK3197J3JWQ8Q0D&appid=8373636744&openid=87JDD73KH32W3983JIUDS92198DS5B32
        # get user nickname as user_name, email empty
        api = "%s?access_token=%s&appid=%s&openid=%s"%(auth["qq_oauth_api_get_user_info"], access_token, auth["qq_oauth_api_app_id"], qq_oauth_openid);
        trace("auto register get user_info from %s"%(api));
        
        # query qq_oauth_openid
        url = urllib.urlopen(api);
        data = url.read();
        url.close();
        
        json_data = data.strip().strip("callback").strip("(").strip(";").strip(")").strip();
        trace("trim get_user_info data to %s"%(json_data));

        try:
            res_json = json.loads(json_data);
        except Exception,e:
            error("ex=%s, info=%s"%(e, traceback.format_exc()));
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"userinfo to json error"});
            
        # check userinfo
        if "error" in res_json:
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"request userinfo error, response=%s"%(data)});
        if "nickname" not in res_json:
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"request nickname invalid, response=%s"%(data)});
        nickname = res_json["nickname"];
        trace("nickname=%s access_token=%s qq_oauth_openid=%s"%(nickname, access_token, qq_oauth_openid));
        
        # check exists.
        user_name = nickname;
        records = sql_exec("select user_id from dr_user where user_name=%s and enabled=true", (user_name));
        
        # exists, change nickname with random postfix.
        if len(records) != 0:
            user_name = "%s%s"%(nickname, int(random.random()*1000000));
        
        # register user
        sql_exec("insert into dr_user(user_name) values(%s)", (user_name));
        records = sql_exec("select user_id from dr_user where user_name=%s", (user_name));
        user_id = records[0]["user_id"];
        trace("auto insert user, access_token=%s, qq_oauth_openid=%s, user_id=%s"%(access_token, qq_oauth_openid, user_id));
        
        self.qq_oauth_register_associate(access_token, qq_oauth_openid, user_id);
        
    def qq_oauth_cache_qq_oauth_openid(self, access_token, qq_oauth_openid):
        auth = _config["auth"];
        
        # query user by qq_oauth_openid from local db.
        records = self.qq_oauth_get_associated(qq_oauth_openid);
        if len(records) == 0:
            # if not auto register user, let user to select the available user.
            if not auth["qq_oauth_auto_register_user"]:
                return self.qq_oauth_query_available_associate_user(access_token, qq_oauth_openid);
            # auto register user then reinitialize the associated records.
            self.qq_oauth_auto_register(access_token, qq_oauth_openid);
            records = self.qq_oauth_get_associated(qq_oauth_openid);
            
        # matched, update session to login success
        (user_id, user_name) = (records[0]["user_id"], records[0]["user_name"]);
        trace("qq_oauth_openid=%s match user %s(id=%s)"%(qq_oauth_openid, user_name, user_id));
        cherrypy.session[SESSION_KEY] = user_id;
        
        res = json.dumps({
            "code":ErrorCode.Success,
            "error":ErrorCode.Success,
            "user_id":user_id, 
            "error_description":"validate success", 
            "api_key":str(cherrypy.session.id) # the api_key used to hack the cookie.
        });
        trace("response: %s"%(res));
        return res;
    
    def qq_oauth_register_associate(self, access_token, qq_oauth_openid, user_id):
        sql_exec("delete from dr_authenticate where user_id=%s and qq_oauth_openid=%s", (user_id, qq_oauth_openid));
        sql_exec("insert into dr_authenticate (user_id, qq_oauth_openid, qq_oauth_access_token) values(%s, %s, %s)", (user_id, qq_oauth_openid, access_token));
        trace("associate user id=%s to auth qq_oauth_openid=%s access_token=%s"%(user_id, qq_oauth_openid, access_token));
    
    def qq_oauth_access(self, access_token):
        auth = _config["auth"];
        
        # https://graph.qq.com/oauth2.0/me?access_token=QE9894RYY787767676G8G87G90980D0D
        api = "%s?access_token=%s"%(auth["qq_oauth_api_me"], access_token);
        trace("validate access_token from %s"%(api));
        
        # query qq_oauth_openid
        url = urllib.urlopen(api);
        data = url.read();
        url.close();
        
        json_data = data.strip().strip("callback").strip("(").strip(";").strip(")").strip();
        trace("trim me data to %s"%(json_data));

        try:
            res_json = json.loads(json_data);
        except Exception,e:
            error(sys.exc_info);
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"qq_oauth_openid to json error"});
            
        # check qq_oauth_openid
        if "error" in res_json:
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"request qq_oauth_openid error, response=%s"%(data)});
        if "openid" not in res_json:
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"request qq_oauth_openid invalid, response=%s"%(data)});
        qq_oauth_openid = res_json["openid"];
        trace("qq_oauth_openid=%s access_token=%s"%(qq_oauth_openid, access_token));
        
        return self.qq_oauth_cache_qq_oauth_openid(access_token, qq_oauth_openid);
        
    def qq_oauth_associate(self, req_json):
        access_token = req_json["access_token"];
        qq_oauth_openid = req_json["qq_oauth_openid"];
        user_id = req_json["user"];
        
        self.qq_oauth_register_associate(access_token, qq_oauth_openid, user_id);
        
        qq_oauth_openid = qq_oauth_openid;
        return self.qq_oauth_cache_qq_oauth_openid(access_token, qq_oauth_openid);
        
    def GET(self, access_token, r=None):
        enable_crossdomain();
        
        auth = _config["auth"];
        if not auth["on"]:
            raise cherrypy.HTTPError(405, "auth is off");
            return;
            
        # valid for QQ-OAuth
        if auth["strategy"] == "qq_oauth":
            return self.qq_oauth_access(access_token);
        else:
            raise cherrypy.HTTPError(405, "no auth strategy speicfied");
        
    def POST(self):
        enable_crossdomain();
        
        auth = _config["auth"];
        if not auth["on"]:
            raise cherrypy.HTTPError(405, "auth is off");
            return;
            
        req_json_str = cherrypy.request.body.read();

        try:
            req_json = json.loads(req_json_str);
        except Exception,e:
            error(sys.exc_info);
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"to json error"});
            
        # valid for QQ-OAuth
        if auth["strategy"] == "qq_oauth":
            return self.qq_oauth_associate(req_json);
        else:
            raise cherrypy.HTTPError(405, "no auth strategy speicfied");
        
    def OPTIONS(self):
        enable_crossdomain();
        
class RESTGroup(object):
    exposed = True;

    @require_auth()
    def GET(self, r=None):
        enable_crossdomain();
        records = sql_exec("select group_id,group_name from dr_group");
        ret = [];
        for record in records:
            ret.append({"id":record["group_id"], "value":record["group_name"]});

        return json.dumps({"code":ErrorCode.Success, "data":ret});
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTAdmin(object):
    exposed = True;

    @require_auth(require_admin)
    def POST(self):
        enable_crossdomain();
        (code, ret) = (ErrorCode.Success, []);
        req_str = cherrypy.request.body.read();
        try:
            req = json.loads(req_str);
        except Exception,e:
            error(sys.exc_info);
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"to json error"});

        if req["action"] == "get_users":
            ret = sql_exec("select * from dr_user");
        elif req["action"] == "set_user":
            ret = sql_exec("update dr_user set user_name=%s,email=%s,enabled=%s where user_id=%s",
                (req["name"], req["email"], req["enabled"], req["id"]));
        elif req["action"] == "create_user":
            ret = sql_exec("insert into dr_user (user_name,email,enabled) values(%s,%s,%s)",
                (req["name"], req["email"], req["enabled"]),True);
        elif req["action"] == "get_user":
            ret = sql_exec("select * from dr_user where user_id=%s", (req["id"],));
            ret = ret[0];
        elif req["action"] == "get_admins":
            ret = sql_exec("select * from dr_authorize_admin");
        elif req["action"] == "set_admin":
            if req["admin"]:
                ret = sql_exec("select * from dr_authorize_admin where user_id=%s",(req["user_id"],));
                if len(ret) <= 0:
                    ret = sql_exec("insert into dr_authorize_admin (user_id) values(%s)", (req["user_id"],));
            else:
                ret = sql_exec("delete from dr_authorize_admin where user_id=%s", (req["user_id"],));
        elif req["action"] == "get_user_group":
            ret = sql_exec("select g.* from dr_group g, dr_rs_group_user r where g.group_id = r.group_id and r.user_id=%s", (req["id"],));
        elif req["action"] == "set_user_group":
            if req["in"]:
                ret = sql_exec("select * from dr_rs_group_user where group_id=%s and user_id=%s",(req["group_id"],req["user_id"]));
                if len(ret) <= 0:
                    ret = sql_exec("insert into dr_rs_group_user (group_id,user_id) values(%s,%s)", (req["group_id"],req["user_id"]));
            else:
                ret = sql_exec("delete from dr_rs_group_user where group_id=%s and user_id=%s", (req["group_id"],req["user_id"]));
        elif req["action"] == "get_groups":
            ret = sql_exec("select * from dr_group");
        elif req["action"] == "create_group":
            ret = sql_exec("insert into dr_group(group_name) values(%s)",(req["name"],), True);
        elif req["action"] == "set_group":
            ret = sql_exec("update dr_group set group_name=%s where group_id=%s",(req["name"],req["id"]));
        elif req["action"] == "get_group":
            ret = sql_exec("select * from dr_group where group_id=%s",(req["group_id"],))[0];
        elif req["action"] == "get_group_user":
            ret = sql_exec("select u.* from dr_user u, dr_rs_group_user r where u.user_id = r.user_id and r.group_id=%s", (req["group_id"],));
        elif req["action"] == "get_products":
            ret = sql_exec("select * from dr_product");
        elif req["action"] == "create_product":
            ret = sql_exec("insert into dr_product(product_name) values(%s)",(req["name"],), True);
        elif req["action"] == "set_product":
            ret = sql_exec("update dr_product set product_name=%s where product_id=%s",(req["name"],req["id"]));
        elif req["action"] == "get_types":
            ret = sql_exec("select * from dr_type");
        elif req["action"] == "create_type":
            ret = sql_exec("insert into dr_type(type_name) values(%s)",(req["name"],), True);
        elif req["action"] == "set_type":
            ret = sql_exec("update dr_type set type_name=%s where type_id=%s",(req["name"],req["id"]));
        else:
            error("invalid action for admin: %s, req=%s"%(req["action"], req_str));
            code = ErrorCode.Failed;

        return json.dumps({"code":code, "data":ret});

    def OPTIONS(self):
        enable_crossdomain();

class RESTProduct(object):
    exposed = True;

    @require_auth()
    def GET(self, r=None):
        enable_crossdomain();
        records = sql_exec("select product_id,product_name from dr_product");
        ret = [];
        for record in records:
            ret.append({"id":record["product_id"], "value":record["product_name"]});

        return json.dumps({"code":ErrorCode.Success, "data":ret});
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTWorkType(object):
    exposed = True;

    @require_auth()
    def GET(self, r=None):
        enable_crossdomain();
        records = sql_exec("select type_id,type_name from dr_type");
        ret = [];
        for record in records:
            ret.append({"id":record["type_id"], "value":record["type_name"]});
        return json.dumps({"code":ErrorCode.Success, "data":ret});
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTUser(object):
    exposed = True;

    @require_auth()
    def GET(self, group="", query_all="false", r=None):
        enable_crossdomain();
        
        if query_all == True or query_all == "true" or str(query_all) == "1":
            query_all = True
        else:
            query_all = False
        
        # if not null, must be a digit.
        if group != "" and str(group) != "-1" and not str(group).isdigit():
            error("group must be digit, actual is %s"%(group));
            raise cherrypy.HTTPError(400, "group must be digit");
        
        records = [];
        if query_all:
            if group == "" or str(group) == "-1":
                records = sql_exec("select user_id,user_name from dr_user");
            else:
                records = sql_exec("select u.user_id,u.user_name "
                    "from dr_user u,dr_group g,dr_rs_group_user rs "
                    "where rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s", (group));
        else:
            if group == "" or str(group) == "-1":
                records = sql_exec("select user_id,user_name from dr_user where enabled=true");
            else:
                records = sql_exec("select u.user_id,u.user_name "
                    "from dr_user u,dr_group g,dr_rs_group_user rs "
                    "where u.enabled=true "
                        "and rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s", (group));
        
        user_id = None;
        auth = _config["auth"];
        if auth["on"]:
            # QQ-OAuth not enabled.
            if auth["strategy"] == "qq_oauth":
                # check QQ-OAuth session.
                user_id = cherrypy.session.get(SESSION_KEY);
                
        # the user cannot authorize by specified user.
        exception_users = authorize_get_exception_user_id(user_id);
        trace("get users while group=%s for user_id=%s exception_users=%s"%(group, user_id, exception_users));
            
        ret = [];
        for record in records:
            returned_user_id = record["user_id"];
            if returned_user_id in exception_users:
                continue;
            ret.append({
                "id":returned_user_id, "value":record["user_name"]
            });
            
        return json.dumps({"code":ErrorCode.Success, "auth":user_id, "users":ret});
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTRedmine(object):
    exposed = True;

    @require_auth()
    def GET(self, issue_id, r=None):
        enable_crossdomain();
        # read config from file.
        redmine = _config["redmine"];
        redmine_api_issues = "%s://%s:%s@%s:%s/%s"%(
            redmine["protocol"], redmine["username"], redmine["password"], 
            redmine["host"], redmine["port"], redmine["path"]);
        # proxy for redmine issues
        # 1. must Enable the RESTful api: http://www.redmine.org/projects/redmine/wiki/Rest_api#Authentication
        # 2. add a user, username="name", password="pwd", add to report user, which can access the issues.
        api = "%s/%s.json"%(redmine_api_issues, issue_id);
        trace(api);
        url = urllib.urlopen(api);
        data = url.read();
        url.close();
        return data;
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTDailyReport(object):
    exposed = True;
    
    '''
    build the sql query conditions.
    @return the builded sql.
    '''
    def build_sql_conditions(self, start_time, end_time, user_id, product_id, type_id):
        (names, params) = ("", []);
        if start_time != "":
            names += " and dr_report.work_date>=%s";
            params.append(start_time);
        if end_time!= "":
            names += " and dr_report.work_date<=%s";
            params.append(end_time);
        if product_id != "":
            names += " and dr_report.product_id=%s";
            params.append(product_id);
        if type_id != "":
            names += " and dr_report.type_id=%s";
            params.append(type_id);
        if user_id != "":
            names += " and dr_report.user_id=%s";
            params.append(user_id);
        if len(params) == 0:
            return (names, None);
        return (names, tuple(params));
    
    '''
    query summary work hours, all users without group
    '''
    def query_summary(self, start_time="", end_time="", user_id="", product_id="", type_id="", query_all=False):
        if query_all:
            sql = "select %s from %s where true"%("sum(work_hours) as work_hours", "dr_report");
        else:
            sql = "select %s from %s where %s"%("sum(work_hours) as work_hours", 
                "dr_report,dr_user u",
                "u.enabled = true and dr_report.user_id = u.user_id");
        (names, params) = self.build_sql_conditions(start_time, end_time, user_id, product_id, type_id);
        sql = "%s %s"%(sql, names);

        records = sql_exec(sql, params);
        ret = {"code":ErrorCode.Success, "data":{
            "user_id":user_id, "product_id":product_id, "type_id":type_id, "work_hours":records[0]["work_hours"]
        }};
        return json.dumps(ret);
        
    '''
    query detail info, all users without group
    '''
    def query_detail(self, start_time="", end_time="", user_id="", product_id="", type_id="", query_all=False):
        if query_all:
            sql = "select %s from %s where true"%(
                "report_id,product_id,user_id,type_id,bug_id,work_hours,report_content,work_date,insert_date,modify_date,priority", 
                "dr_report");
        else:
            sql = "select %s from %s where %s"%(
                "report_id,product_id,u.user_id,type_id,bug_id,work_hours,report_content,work_date,insert_date,modify_date,priority", 
                "dr_report,dr_user u",
                "u.enabled = true and dr_report.user_id = u.user_id");
        (names, params) = self.build_sql_conditions(start_time, end_time, user_id, product_id, type_id);
        sql = "%s %s %s"%(sql, names, "order by dr_report.report_id asc");

        records = sql_exec(sql, params);
        ret = [];
        
        for record in records:
            ret.append({
                "report_id":record["report_id"], "product_id":record["product_id"], "user_id":record["user_id"], 
                "type_id":record["type_id"], "bug_id":record["bug_id"], "work_hours":record["work_hours"], 
                "report_content":record["report_content"], "work_date":str(record["work_date"]), 
                "insert_date":str(record["insert_date"]), "modify_date":str(record["modify_date"]), 
                "priority":record["priority"]
            });

        return json.dumps({"code":ErrorCode.Success, "data":ret});
        
    '''
    query summary hours of specified group
    '''
    def query_summary_group(self, group, start_time="", end_time="", user_id="", product_id="", type_id="", query_all=False):
        if query_all:
            sql = "select %s from %s where %s"%("sum(work_hours) as work_hours", 
                "dr_report,dr_user u,dr_group g,dr_rs_group_user rs",
                "dr_report.user_id = rs.user_id and rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s"%(group));
        else:
            sql = "select %s from %s where %s"%("sum(work_hours) as work_hours", 
                "dr_report,dr_user u,dr_group g,dr_rs_group_user rs",
                "u.enabled = true and dr_report.user_id = rs.user_id and rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s"%(group));
        (names, params) = self.build_sql_conditions(start_time, end_time, user_id, product_id, type_id);
        sql = "%s %s"%(sql, names);

        records = sql_exec(sql, params);
        ret = {"code":ErrorCode.Success, "data": {
            "user_id":user_id, "product_id":product_id, "type_id":type_id, "work_hours":records[0]["work_hours"]
        }};
        return json.dumps(ret);
        
    '''
    query detail info of specified group
    '''
    def query_detail_group(self, group, start_time="", end_time="", user_id="", product_id="", type_id="", query_all=False):
        if query_all:
            sql = "select %s from %s where %s"%(
                "report_id,product_id,u.user_id,type_id,bug_id,work_hours,report_content,work_date,insert_date,modify_date,priority", 
                "dr_report,dr_user u,dr_group g,dr_rs_group_user rs",
                "dr_report.user_id = rs.user_id and rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s"%(group));
        else:
            sql = "select %s from %s where %s"%(
                "report_id,product_id,u.user_id,type_id,bug_id,work_hours,report_content,work_date,insert_date,modify_date,priority", 
                "dr_report,dr_user u,dr_group g,dr_rs_group_user rs",
                "u.enabled = true and dr_report.user_id = rs.user_id and rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s"%(group));
        (names, params) = self.build_sql_conditions(start_time, end_time, user_id, product_id, type_id);
        sql = "%s %s %s"%(sql, names, "order by dr_report.report_id asc");

        records = sql_exec(sql, params);
        ret = [];
        
        for record in records:
            ret.append({
                "report_id":record["report_id"], "product_id":record["product_id"], "user_id":record["user_id"], 
                "type_id":record["type_id"], "bug_id":record["bug_id"], "work_hours":record["work_hours"], 
                "report_content":record["report_content"], "work_date":str(record["work_date"]), 
                "insert_date":str(record["insert_date"]), "modify_date":str(record["modify_date"]), 
                "priority":record["priority"]
            });

        return json.dumps({"code":ErrorCode.Success, "data":ret});
        
    @require_auth()
    def GET(self, group="", start_time="", end_time="", summary="", user_id="", product_id="", type_id="", query_all="false", r=None):
        enable_crossdomain();
        
        if query_all == True or query_all == "true" or str(query_all) == "1":
            query_all = True
        else:
            query_all = False
            
        # if not null, must be a digit.
        if group != "" and str(group) != "-1" and not str(group).isdigit():
            error("group must be digit, actual is %s"%(group));
            raise cherrypy.HTTPError(400, "group must be digit");
        
        trace('group=%s, start_time=%s, end_time=%s, summary=%s, user_id=%s, product_id=%s, type_id=%s, query_all=%s'%(group, start_time, end_time, summary, user_id, product_id, type_id, query_all));
        if user_id != "":
            authorize_user(user_id);
        
        if group == "" or str(group) == "-1":
            if summary == "1":
                return self.query_summary(start_time, end_time, user_id, product_id, type_id, query_all);
            else:
                return self.query_detail(start_time, end_time, user_id, product_id, type_id, query_all);
        else:
            if summary == "1":
                return self.query_summary_group(group, start_time, end_time, user_id, product_id, type_id, query_all);
            else:
                return self.query_detail_group(group, start_time, end_time, user_id, product_id, type_id, query_all);

    @require_auth()
    def POST(self):
        enable_crossdomain();
        req_json_str = cherrypy.request.body.read();

        try:
            req_json = json.loads(req_json_str);
        except Exception,e:
            error(sys.exc_info);
            return json.dumps({"code":ErrorCode.Failed, "error":ErrorCode.Failed, "error_description":"to json error"});
        
        user_id = req_json["user"];
        work_date = req_json["date"];
        
        # check authorize.
        authorize_user(user_id);
        
        # remove the removed reports
        exists_reports = [];
        for item in req_json["items"]:
            report_id = item["report_id"];
            if report_id != "" and report_id != 0:
                exists_reports.append(str(report_id));
        if len(exists_reports) > 0:
            sql_exec("delete from dr_report where user_id=%s and work_date=%s and report_id not in (" + ",".join(exists_reports) + ")", (user_id, work_date));
        else:
            sql_exec("delete from dr_report where user_id=%s and work_date=%s", (user_id, work_date));
        # update or insert new
        for item in req_json["items"]:
            report_id = item["report_id"];
            product_id = item["product_id"];
            type_id = item["type_id"];
            bug_id = item["bug_id"];
            report_content = item["report_content"];
            work_hours = item["work_hours"];
            priority = item["priority"];
            if report_id != "" and report_id != 0:
                ret = sql_exec("update dr_report set product_id=%s, user_id=%s, type_id=%s, bug_id=%s, work_hours=%s, priority=%s, report_content=%s, work_date=%s, modify_date=now() "
                        "where report_id=%s and (product_id!=%s or user_id!=%s or type_id!=%s or bug_id!=%s or work_hours!=%s or priority!=%s or report_content!=%s or work_date!=%s)",
                        (product_id, user_id, type_id, bug_id, work_hours, priority, report_content, work_date, report_id, product_id, user_id, type_id, bug_id, work_hours, priority, report_content, work_date));
            else:
                ret = sql_exec("insert into dr_report (product_id, user_id, type_id, bug_id, work_hours, priority, report_content, work_date, insert_date, modify_date) values(%s, %s, %s, %s, %s, %s, %s, %s, now(), now())",
                        (product_id, user_id, type_id, bug_id, work_hours, priority, report_content, work_date));

        return json.dumps({"code":ErrorCode.Success, "error":ErrorCode.Success, "desc":"success"});
        
    def OPTIONS(self):
        enable_crossdomain();
    
class Root(object):
    exposed = True;
    def GET(self):
        raise cherrypy.HTTPRedirect("ui/");

class Manager:
    def __init__(self):
        pass;
        
    def start(self):
        pass;
        
    def stop(self):
        pass;
            
    def main(self):
        mail = _config["mail"];
        # on?
        if not mail["on"]:
            return;
        # check time.
        mail_times = mail["mail_times"]
        for mail_time in mail_times:
            if not self.email_for_time(mail_time, mail_times):
                return;
            
    def email_for_time(self, mail_time, mail_times):
        (hour, minute, second) = mail_time.split(":");
        now = datetime.datetime.now();
        if now.hour != int(hour):
            return True;
        if now.minute != int(minute):
            return True;
        if now.second != int(second):
            return True;
        mail = _config["mail"];
        # log
        date = now.strftime("%Y-%m-%d");
        trace("email from %s when time is %s, date is %s"%(mail["username"], mail_times, date));
        time.sleep(1);
        # check email strategy
        if not self.email_strategy_check(date):
            return False;
        # query email to user list.
        records = sql_exec("select user_id,user_name,email from dr_user where enabled=true and user_id not in "
            "(select distinct u.user_id from dr_user u, dr_report r where u.user_id = r.user_id and r.work_date=%s)"%(date));
        if len(records) == 0:
            trace("all user reported, donot email");
            return False;
        # generate to user list.
        to_user = [];
        for record in records:
            to_user.append(record["user_name"]);
        trace("email to %s."%(to_user));
        for record in records:
            if not self.do_email_to(record["user_id"], record["user_name"], record["email"], date):
                return False;
        trace("email to %s cc=%s success."%(to_user, mail["cc_user"]));
        return True;
        
    def do_email_to(self, user_id, user_name, email, date):
        if email is None:
            error("ignore the empty email for user %s(%s)"%(user_name, user_id));
            return True;
            
        mail = _config["mail"];
        # generate subject
        subject = mail["subject"];
        content = mail["content"];
        # generate content
        subject = subject.replace("{user_name}", user_name).replace("{date}", date);
        content = content.replace("{user_id}", str(user_id));
        # do email.
        if not send_mail(mail["smtp_server"], mail["username"], mail["password"], [email], mail["cc_user"], subject, content):
            trace("email to %s(%s) id=%s failed"%(user_name, email, user_id));
            return False;
        trace("email to %s(%s) id=%s success"%(user_name, email, user_id));
        return True;
    
    def email_strategy_check(self, date):
        mail = _config["mail"];
        # check only when someone has submitted report.
        if mail["strategy_check_only_someone_submited"]:
            records = sql_exec("select user_id,email from dr_user where enabled=true and user_id in "
                "(select distinct u.user_id from dr_user u, dr_report r where u.user_id = r.user_id and r.work_date=%s)"%(date));
            if len(records) < mail["strategy_check_only_someone_submited_count"]:
                trace("strategy_check_only_someone_submited is checked, "
                    "bug only %s submited(<%s), ignore and donot email."%(len(records), mail["strategy_check_only_someone_submited_count"]));
                return False;
        return True;

# parse argv as base dir
config_file = "config.conf";
if len(sys.argv) > 1:
    config_file = sys.argv[1];

# reload the config.
def do_reload():
    _config = reload_config(os.path.join(get_work_dir(), config_file), js_file_path, version);
    auth_init(_config);
    utility_init(_config);
    return _config;
    
# static dir specifies the dir which store static html/js/css/images files.
static_dir = os.path.join(get_work_dir(), "static-dir");
# the js file path, must under the static dir.
js_dir = os.path.join(static_dir, "dynamic-js")
if not os.path.exists(js_dir):
    os.mkdir(js_dir)
js_file_path = os.path.join(js_dir, "conf.js");
# reload config, init log and generate js config file
_config = do_reload();

# init ui tree.
root = Root();
root.redmines = RESTRedmine();
root.reports = RESTDailyReport();
root.users = RESTUser();
root.products = RESTProduct();
root.groups = RESTGroup();
root.admins = RESTAdmin();
root.work_types = RESTWorkType();
root.auths = RESTAuth();

conf = {
    'global': {
        'server.socket_host': '0.0.0.0',
        'server.socket_port': _config["system"]["port"],
        # static files
        'tools.staticdir.on': True,
        'tools.staticdir.dir': static_dir,
        'tools.staticdir.index': 'index.html',
        #'server.thread_pool': 1, # single thread server.
        'tools.encode.on': True,
        'tools.encode.encoding': 'utf-8',
        'tools.auth.on': _config["auth"]["on"],
        # session
        'tools.sessions.on': _config["session"]["on"],
        'tools.sessions.storage_type': _config["session"]["storage_type"],
        'tools.sessions.timeout': _config["session"]["timeout_minutes"],
        'tools.crossdomain_session.on': _config["session"]["crossdomain_session"]
    },
    '/': {
        'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
    }
}

# global instance for manage all tasks.
manager = Manager();
'''
the cherrypy event mechenism:
http://docs.cherrypy.org/stable/progguide/extending/customplugins.html
http://stackoverflow.com/questions/2004514/force-cherrypy-child-threads
'''
from cherrypy.process.plugins import SimplePlugin;
class QueueThreadPlugin(SimplePlugin):
    def start(self):
        manager.start();
    def stop(self):
        manager.stop();
    def main(self):
        manager.main();
# subscribe the start/stop event of cherrypy engine.
QueueThreadPlugin(cherrypy.engine).subscribe();
    
'''
http://docs.cherrypy.org/stable/refman/process/plugins/signalhandler.html#signalhandler
'''
import signal;
def handle_SIGUSR2():
    trace("get SIGUSR2, reload config.");
    _config = do_reload();
    cherrypy.engine.restart();
cherrypy.engine.signal_handler.handlers[signal.SIGUSR2] = handle_SIGUSR2;

trace("version:%s"%(version))
cherrypy.quickstart(root, '/', conf)
