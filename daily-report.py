#!/usr/bin/python2.6
#-*- coding: UTF-8 -*-

import sys, time, os, json, traceback, datetime, urllib, random;
import cherrypy, MySQLdb;

# set the default encoding to utf-8
# reload sys model to enable the getdefaultencoding method.
reload(sys);
# using exec to set the encoding, to avoid error in IDE.
exec("sys.setdefaultencoding('utf-8')");
assert sys.getdefaultencoding().lower() == "utf-8";

SESSION_KEY = '_cp_user_id'
    
'''
authorize: get the user ids that cannot access by user_id.
'''
def authorize_get_exception_user_id(user_id):
    if user_id is None:
        return [];
        
    # check admin role, if admin, access all users.
    records = sql_exec("select user_id from dr_authorize_admin where user_id='%s'"%(user_id));
    if len(records) > 0:
        return [];
        
    # check manager role, if manager, access himself and all users managed by him.
    records = sql_exec("select user_id from dr_user "
        "where user_id!='%s' "
        "and user_id not in(select user_id from dr_authorize_manager where manager_id='%s')"
        %(user_id, user_id));
        
    ret = [];
    for record in records:
        ret.append(record[0]);
        
    return ret;

'''
authorize: require user specified by request_user_id
'''
def authorize_user(request_user_id):
    auth = _config["auth"];
    if not auth["on"]:
        return;
        
    # method donot require check.
    conditions = cherrypy.request.config.get('auth.require', None)
    if conditions is None:
        return;
        
    # QQ-OAuth not enabled.
    if auth["strategy"] == "qq_oauth":
        # check QQ-OAuth session.
        key = cherrypy.session.get(SESSION_KEY);
        if key is None:
            error("authorize_user invalid, no session.");
            enable_crossdomain();
            raise cherrypy.HTTPError(401, "You are not authorized, login please.");
            return;
        if request_user_id in authorize_get_exception_user_id(key):
            error("authorize_user(id=%s) requires user id=%s invalid, check authorization failed."%(key, request_user_id));
            enable_crossdomain();
            raise cherrypy.HTTPError(403, "You(id=%s) are not authorized as %s, login please."%(key, request_user_id));
            return;
        trace("authorize success, user_id=%s requires id=%s"%(key, request_user_id));
            
    return;
    

def check_auth(*args, **kwargs):
    # auth not enabled in config.
    auth = _config["auth"];
    if not auth["on"]:
        return;
        
    # method donot require check.
    conditions = cherrypy.request.config.get('auth.require', None)
    if conditions is None:
        return;
        
    # QQ-OAuth not enabled.
    if auth["strategy"] == "qq_oauth":
        # check QQ-OAuth session.
        key = cherrypy.session.get(SESSION_KEY);
        if key is None:
            error("session invalid, check auth failed.");
            enable_crossdomain();
            raise cherrypy.HTTPError(401, "You are not authorized, login please.");
            return;
    
    # check condition.
    for condition in conditions:
        if not condition():
            error("codition check invalid, check auth failed.");
            enable_crossdomain();
            raise cherrypy.HTTPError(401, "You are not authorized for specified condition");
            return;
            
    trace("check auth success. key=%s"%(key));
    
cherrypy.tools.auth = cherrypy.Tool('before_handler', check_auth)

'''
@conditions defines what need to check for method.
'''
def check_auth(*conditions):
    def decorate(f):
        if not hasattr(f, "_cp_config"):
            f._cp_config = {};
        if 'auth.require' not in f._cp_config:
            f._cp_config['auth.require'] = []
        f._cp_config['auth.require'].extend(conditions)
        return f;
    return decorate;

def sql_escape(sql):
    return sql.replace("'", "\\'");
def sql_exec(sql):
    conn = None;
    cursor = None;
    try:
        trace("connect to mysql");
        mysql_config = _config["mysql_config"];
        conn = MySQLdb.connect(mysql_config["host"], mysql_config["user"], mysql_config["passwd"], mysql_config["db"], charset='utf8');
        cursor = conn.cursor();
        trace("execute sql: %s"%(sql));
        cursor.execute(sql);
        ret = cursor.fetchall();
        conn.commit();
        return ret;
    finally:
        if cursor is not None: cursor.close();
        if conn is not None: conn.close();

def enable_crossdomain():
    cherrypy.response.headers["Access-Control-Allow-Origin"] = "*";
    cherrypy.response.headers["Access-Control-Allow-Methods"] = "GET, POST, HEAD, PUT, DELETE";
    # generate allow headers.
    allow_headers = ["Cache-Control", "X-Proxy-Authorization", "X-Requested-With", "Content-Type"];
    cherrypy.response.headers["Access-Control-Allow-Headers"] = ",".join(allow_headers);

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
        records = sql_exec("select user_id,user_name from dr_user where user_id not in (select user_id from dr_authenticate)");
        for record in records:
            users.append({"id":record[0], "value":record[1]});
        return json.dumps({"error":ErrorCode.NotAssociated, 
            "access_token":access_token, "qq_oauth_openid":qq_oauth_openid, "users":users, 
            "error_description":"user not found, please associate one"});
            
    def qq_oauth_get_associated(self, qq_oauth_openid):
        return sql_exec("select u.user_id,u.user_name from dr_user u, dr_authenticate a "
            "where u.user_id=a.user_id and a.qq_oauth_openid='%s'"%(qq_oauth_openid));
            
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
            error(sys.exc_info);
            return json.dumps({"error":ErrorCode.Failed, "error_description":"userinfo to json error"});
            
        # check userinfo
        if "error" in res_json:
            return json.dumps({"error":ErrorCode.Failed, "error_description":"request userinfo error, response=%s"%(data)});
        if "nickname" not in res_json:
            return json.dumps({"error":ErrorCode.Failed, "error_description":"request nickname invalid, response=%s"%(data)});
        nickname = res_json["nickname"];
        trace("nickname=%s access_token=%s qq_oauth_openid=%s"%(nickname, access_token, qq_oauth_openid));
        
        # check exists.
        user_name = nickname;
        records = sql_exec("select user_id from dr_user where user_name='%s'"%(user_name));
        
        # exists, change nickname with random postfix.
        if len(records) != 0:
            user_name = "%s%s"%(nickname, int(random.random()*1000000));
        
        # register user
        sql_exec("insert into dr_user(user_name) values('%s')"%(user_name));
        records = sql_exec("select user_id from dr_user where user_name='%s'"%(user_name));
        user_id = records[0][0];
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
        (user_id, user_name) = (records[0][0], records[0][1]);
        trace("qq_oauth_openid=%s match user %s(id=%s)"%(qq_oauth_openid, user_name, user_id));
        cherrypy.session[SESSION_KEY] = user_id;
        
        return json.dumps({"error":ErrorCode.Success, "user_id":user_id, "error_description":"validate success"});
    
    def qq_oauth_register_associate(self, access_token, qq_oauth_openid, user_id):
        sql_exec("delete from dr_authenticate where user_id=%s and qq_oauth_openid='%s'"%(user_id, qq_oauth_openid));
        sql_exec("insert into dr_authenticate (user_id, qq_oauth_openid, qq_oauth_access_token) values('%s', '%s', '%s')"%(user_id, qq_oauth_openid, access_token));
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
            return json.dumps({"error":ErrorCode.Failed, "error_description":"qq_oauth_openid to json error"});
            
        # check qq_oauth_openid
        if "error" in res_json:
            return json.dumps({"error":ErrorCode.Failed, "error_description":"request qq_oauth_openid error, response=%s"%(data)});
        if "openid" not in res_json:
            return json.dumps({"error":ErrorCode.Failed, "error_description":"request qq_oauth_openid invalid, response=%s"%(data)});
        qq_oauth_openid = res_json["openid"];
        trace("qq_oauth_openid=%s access_token=%s"%(qq_oauth_openid, access_token));
        
        return self.qq_oauth_cache_qq_oauth_openid(access_token, qq_oauth_openid);
        
    def qq_oauth_associate(self, req_json):
        access_token = sql_escape(req_json["access_token"]);
        qq_oauth_openid = sql_escape(req_json["qq_oauth_openid"]);
        user_id = sql_escape(req_json["user"]);
        
        self.qq_oauth_register_associate(access_token, qq_oauth_openid, user_id);
        
        qq_oauth_openid = qq_oauth_openid;
        return self.qq_oauth_cache_qq_oauth_openid(access_token, qq_oauth_openid);
        
    def GET(self, access_token):
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
            return json.dumps({"error":ErrorCode.Failed, "error_description":"to json error"});
            
        # valid for QQ-OAuth
        if auth["strategy"] == "qq_oauth":
            return self.qq_oauth_associate(req_json);
        else:
            raise cherrypy.HTTPError(405, "no auth strategy speicfied");
        
    def OPTIONS(self):
        enable_crossdomain();
        
class RESTGroup(object):
    exposed = True;

    @check_auth()
    def GET(self):
        enable_crossdomain();
        records = sql_exec("select group_id,group_name from dr_group");
        ret = [];
        for record in records:
            ret.append({"id":record[0], "value":record[1]});
        
        return json.dumps(ret);
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTProduct(object):
    exposed = True;

    @check_auth()
    def GET(self):
        enable_crossdomain();
        records = sql_exec("select product_id,product_name from dr_product");
        ret = [];
        for record in records:
            ret.append({"id":record[0], "value":record[1]});
        
        return json.dumps(ret);
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTWorkType(object):
    exposed = True;

    @check_auth()
    def GET(self):
        enable_crossdomain();
        records = sql_exec("select type_id,type_name from dr_type");
        ret = [];
        for record in records:
            ret.append({"id":record[0], "value":record[1]});
        return json.dumps(ret);
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTUser(object):
    exposed = True;

    @check_auth()
    def GET(self, group=""):
        enable_crossdomain();
        
        # if not null, must be a digit.
        if group != "" and not group.isdigit():
            error("group must be digit, actual is %s"%(group));
            raise cherrypy.HTTPError(400, "group must be digit");
        
        records = [];
        if group == "":
            records = sql_exec("select user_id,user_name from dr_user");
        else:
            records = sql_exec("select u.user_id,u.user_name "
                "from dr_user u,dr_group g,dr_rs_group_user rs "
                "where rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s"%(group));
        
        user_id = None;
        auth = _config["auth"];
        if auth["on"]:
            # QQ-OAuth not enabled.
            if auth["strategy"] == "qq_oauth":
                # check QQ-OAuth session.
                key = cherrypy.session.get(SESSION_KEY);
                user_id = key;
                
        # the user cannot authorize by specified user.
        exception_users = authorize_get_exception_user_id(user_id);
        trace("get users while group=%s for user_id=%s exception_users=%s"%(group, user_id, exception_users));
            
        ret = [];
        for record in records:
            returned_user_id = record[0];
            if returned_user_id in exception_users:
                continue;
            ret.append({"id":returned_user_id, "value":record[1]});
            
        return json.dumps({"auth":user_id, "users":ret});
        
    def OPTIONS(self):
        enable_crossdomain();

class RESTRedmine(object):
    exposed = True;

    @check_auth()
    def GET(self, issue_id):
        enable_crossdomain();
        # read config from file.
        redmine_api_issues = _config["redmine_api_issues"]
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
    def build_sql_conditions(self, sql, start_time, end_time, user_id, product_id, type_id):
        if start_time != "":
            sql += " and dr_report.work_date>='%s'"%(start_time);
        if end_time!= "":
            sql += " and dr_report.work_date<='%s'"%(end_time);
        if product_id != "":
            sql += " and dr_report.product_id=%s"%(product_id);
        if type_id != "":
            sql += " and dr_report.type_id=%s"%(type_id);
        if user_id != "":
            sql += " and dr_report.user_id=%s"%(user_id);
        return sql;
    
    '''
    query summary work hours, all users without group
    '''
    def query_summary(self, start_time="", end_time="", user_id="", product_id="", type_id=""):
        sql = "select %s from %s where true"%("sum(work_hours)", "dr_report");
        sql = self.build_sql_conditions(sql, start_time, end_time, user_id, product_id, type_id);

        records = sql_exec(sql);
        ret = {"user_id":user_id, "product_id":product_id, "type_id":type_id, "work_hours":records[0][0]};
        return json.dumps(ret);
        
    '''
    query detail info, all users without group
    '''
    def query_detail(self, start_time="", end_time="", user_id="", product_id="", type_id=""):
        sql = "select %s from %s where true"%("report_id,product_id,user_id,type_id,bug_id,work_hours,report_content,work_date,insert_date,modify_date,priority", "dr_report");
        sql = self.build_sql_conditions(sql, start_time, end_time, user_id, product_id, type_id);
        sql = "%s %s"%(sql, "order by dr_report.report_id asc");

        records = sql_exec(sql);
        ret = [];
        
        for record in records:
            ret.append({
                "report_id":record[0], "product_id":record[1], "user_id":record[2], 
                "type_id":record[3], "bug_id":record[4], "work_hours":record[5], 
                "report_content":record[6], "work_date":str(record[7]), "insert_date":str(record[8]), "modify_date":str(record[9]), 
                "priority":record[10]
            });
        
        return json.dumps(ret);
        
    '''
    query summary hours of specified group
    '''
    def query_summary_group(self, group, start_time="", end_time="", user_id="", product_id="", type_id=""):
        sql = "select %s from %s where %s"%("sum(work_hours)", 
            "dr_report,dr_user u,dr_group g,dr_rs_group_user rs",
            "dr_report.user_id = rs.user_id and rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s"%(group));
        sql = self.build_sql_conditions(sql, start_time, end_time, user_id, product_id, type_id);

        records = sql_exec(sql);
        ret = {"user_id":user_id, "product_id":product_id, "type_id":type_id, "work_hours":records[0][0]};
        return json.dumps(ret);
        
    '''
    query detail info of specified group
    '''
    def query_detail_group(self, group, start_time="", end_time="", user_id="", product_id="", type_id=""):
        sql = "select %s from %s where %s"%(
            "report_id,product_id,u.user_id,type_id,bug_id,work_hours,report_content,work_date,insert_date,modify_date,priority", 
            "dr_report,dr_user u,dr_group g,dr_rs_group_user rs",
            "dr_report.user_id = rs.user_id and rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s"%(group));
        sql = self.build_sql_conditions(sql, start_time, end_time, user_id, product_id, type_id);
        sql = "%s %s"%(sql, "order by dr_report.report_id asc");

        records = sql_exec(sql);
        ret = [];
        
        for record in records:
            ret.append({
                "report_id":record[0], "product_id":record[1], "user_id":record[2], 
                "type_id":record[3], "bug_id":record[4], "work_hours":record[5], 
                "report_content":record[6], "work_date":str(record[7]), "insert_date":str(record[8]), "modify_date":str(record[9]), 
                "priority":record[10]
            });
        
        return json.dumps(ret);
        
    @check_auth()
    def GET(self, group="", start_time="", end_time="", summary="", user_id="", product_id="", type_id=""):
        enable_crossdomain();
        
        # if not null, must be a digit.
        if group != "" and not group.isdigit():
            error("group must be digit, actual is %s"%(group));
            raise cherrypy.HTTPError(400, "group must be digit");
        
        trace('group=%s, start_time=%s, end_time=%s, summary=%s, user_id=%s, product_id=%s, type_id=%s'%(group, start_time, end_time, summary, user_id, product_id, type_id));
        if user_id != "":
            authorize_user(user_id);
        
        if group == "":
            if summary == "1":
                return self.query_summary(start_time, end_time, user_id, product_id, type_id);
            else:
                return self.query_detail(start_time, end_time, user_id, product_id, type_id);
        else:
            if summary == "1":
                return self.query_summary_group(group, start_time, end_time, user_id, product_id, type_id);
            else:
                return self.query_detail_group(group, start_time, end_time, user_id, product_id, type_id);

    @check_auth()
    def POST(self):
        enable_crossdomain();
        req_json_str = cherrypy.request.body.read();

        try:
            req_json = json.loads(req_json_str);
        except Exception,e:
            error(sys.exc_info);
            return json.dumps({"error":ErrorCode.Failed, "error_description":"to json error"});
        
        user_id = sql_escape(req_json["user"]);
        work_date = sql_escape(req_json["date"]);
        
        # check authorize.
        authorize_user(user_id);
        
        # remove the removed reports
        exists_reports = [];
        for item in req_json["items"]:
            report_id = sql_escape(item["report_id"]);
            if report_id != "" and report_id != 0:
                exists_reports.append(report_id);
        if len(exists_reports) > 0:
            sql_exec("delete from dr_report where user_id=%s and work_date='%s' and report_id not in (%s)"%(user_id, work_date, ",".join(exists_reports)));
        else:
            sql_exec("delete from dr_report where user_id=%s and work_date='%s'"%(user_id, work_date));
        # update or insert new
        for item in req_json["items"]:
            report_id = sql_escape(item["report_id"]);
            product_id = sql_escape(item["product_id"]);
            type_id = sql_escape(item["type_id"]);
            bug_id = sql_escape(item["bug_id"]);
            report_content = sql_escape(item["report_content"]);
            work_hours = sql_escape(item["work_hours"]);
            priority = sql_escape(item["priority"]);
            if report_id != "" and report_id != 0:
                ret = sql_exec("update dr_report set product_id='%s', user_id='%s', type_id='%s', bug_id='%s', work_hours='%s', priority='%s', report_content='%s', work_date='%s', modify_date=%s where %s"
                        %(product_id, user_id, type_id, bug_id, work_hours, priority, report_content, work_date, "now()", 
                        "report_id='%s' and (product_id!='%s' or user_id!='%s' or type_id!='%s' or bug_id!='%s' or work_hours!='%s' or priority!='%s' or report_content!='%s' or work_date!='%s')"
                            %(report_id, product_id, user_id, type_id, bug_id, work_hours, priority, report_content, work_date)));
            else:
                ret = sql_exec("insert into dr_report (product_id, user_id, type_id, bug_id, work_hours, priority, report_content, work_date, insert_date, modify_date) values('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', %s, %s)"
                        %(product_id, user_id, type_id, bug_id, work_hours, priority, report_content, work_date, "now()", "now()"));

        return json.dumps({"error":ErrorCode.Success, "desc":"success"});
        
    def OPTIONS(self):
        enable_crossdomain();
    
class Root(object):
    exposed = True;
    def GET(self):
        raise cherrypy.HTTPRedirect("ui");
        
# in centos 5.5 64bit platform, maybe sendmail failed.
# error is: "send email failed: unknown encoding: idna"
# so, we import the encodings.idna.
from encodings import ascii
from encodings import idna

import smtplib
from email.mime.text import MIMEText
def send_mail(smtp_server, username, password, to_user, subject, content):
    msg = MIMEText(content, _subtype='html', _charset='utf-8');
    msg['Subject'] = subject;
    msg['From'] = username;
    msg['To'] = ";".join(to_user);

    try:
        smtp = smtplib.SMTP();

        smtp.connect(smtp_server);
        smtp.login(username, password);
        smtp.sendmail(username, to_user, msg.as_string());
        smtp.close();

        return True;
    except Exception, ex:
        error("send email failed: %s, %s"%(ex, sys.exc_info));
        return False;

class Manager:
    def __init__(self):
        pass;
        
    def start(self):
        pass;
        
    def stop(self):
        pass;
            
    def main(self):
        mail_config = _config["mail_config"];
        # on?
        if not mail_config["on"]:
            return;
        # check time.
        mail_times = mail_config["mail_times"]
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
        mail_config = _config["mail_config"];
        # log
        date = now.strftime("%Y-%m-%d");
        trace("email from %s when time is %s, date is %s"%(mail_config["username"], mail_times, date));
        time.sleep(1);
        # check email strategy
        if not self.email_strategy_check(date):
            return False;
        # query email to user list.
        records = sql_exec("select user_id,user_name,email from dr_user where user_id not in "
            "(select distinct u.user_id from dr_user u, dr_report r where u.user_id = r.user_id and r.work_date='%s')"%(date));
        if len(records) == 0:
            trace("all user reported, donot email");
            return False;
        # generate to user list.
        to_user = [];
        for record in records:
            to_user.append(record[1]);
        trace("email to %s."%(to_user));
        for record in records:
            if not self.do_email_to(record[0], record[1], record[2], date):
                return False;
        trace("email to %s success."%(to_user));
        return True;
        
    def do_email_to(self, user_id, user_name, email, date):
        mail_config = _config["mail_config"];
        # generate subject
        subject = mail_config["subject"];
        content = mail_config["content"];
        # generate content
        subject = subject.replace("{user_name}", user_name).replace("{date}", date);
        content = content.replace("{user_id}", str(user_id));
        # do email.
        if not send_mail(mail_config["smtp_server"], mail_config["username"], mail_config["password"], [email], subject, content):
            trace("email to %s(%s) id=%s failed"%(user_name, email, user_id));
            return False;
        trace("email to %s(%s) id=%s success"%(user_name, email, user_id));
        return True;
    
    def email_strategy_check(self, date):
        mail_config = _config["mail_config"];
        # check only when someone has submitted report.
        if mail_config["strategy_check_only_someone_submited"]:
            records = sql_exec("select user_id,email from dr_user where user_id in "
                "(select distinct u.user_id from dr_user u, dr_report r where u.user_id = r.user_id and r.work_date='%s')"%(date));
            if len(records) < mail_config["strategy_check_only_someone_submited_count"]:
                trace("strategy_check_only_someone_submited is checked, "
                    "bug only %s submited(<%s), ignore and donot email."%(len(records), mail_config["strategy_check_only_someone_submited_count"]));
                return False;
        return True;
    
from utility import parse_config, initialize_log, error, trace;
def reload_config(config_file):
    # global consts.
    static_dir = None;

    # global config.
    _config = parse_config(config_file);
    initialize_log(_config["log"]["log_to_console"], _config["log"]["log_to_file"], _config["log"]["log_file"]);
    trace(json.dumps(_config, indent=2));

    # generate js conf by config
    if True:
        js_config = _config["js_config"];
        # base_dir is set to the execute file dir.
        base_dir = os.path.abspath(os.path.dirname(sys.argv[0]));
        static_dir = os.path.join(os.path.abspath(base_dir), "static-dir");
        log = _config["log"];
        trace("base_dir=%s, static_dir=%s, port=%s, log=%s(file:%s, console:%s)"
            %(base_dir, static_dir, _config["cherrypy_config"]["port"], 
            log["log_file"], log["log_to_console"], log["log_to_file"]));
        f = open(os.path.join(static_dir, "ui", "conf.js"), "w");
        for js in js_config:
            f.write("%s\n"%(js));
        if _config["auth"]["on"] and _config["auth"]["strategy"] == "qq_oauth":
            f.write("%s\n"%("function enable_auth(){\n    return true;\n}"));
            f.write("%s\n"%("function get_qq_oauth_app_id(){\n    return '" + _config["auth"]["qq_oauth_api_app_id"] + "';\n}"));
            f.write("%s\n"%("function get_qq_oauth_redirect_url(){\n    return '" + _config["auth"]["qq_oauth_api_redirect_url"] + "';\n}"));
            f.write("%s\n"%("function get_qq_oauth_state(){\n    return '" + _config["auth"]["qq_oauth_api_state"] + "';\n}"));
        else:
            f.write("%s\n"%("function enable_auth(){\n    return false;\n}"));
            f.write("%s\n"%("function get_qq_oauth_app_id(){\n    return 'xxx';\n}"));
            f.write("%s\n"%("function get_qq_oauth_redirect_url(){\n    return 'http://xxx';\n}"));
            f.write("%s\n"%("function get_qq_oauth_state(){\n    return 'xxx';\n}"));
        f.close();
        
    return (static_dir, _config);

# parse argv as base dir
config_file = "config.conf";
if len(sys.argv) > 1:
    config_file = sys.argv[1];
(static_dir, _config) = reload_config(config_file);

# init ui tree.
root = Root();
root.redmines = RESTRedmine();
root.reports = RESTDailyReport();
root.users = RESTUser();
root.products = RESTProduct();
root.groups = RESTGroup();
root.work_types = RESTWorkType();
root.auths = RESTAuth();

conf = {
    'global': {
        'server.socket_host': '0.0.0.0',
        'server.socket_port': _config["cherrypy_config"]["port"],
        # static files
        'tools.staticdir.on': True,
        'tools.staticdir.dir': static_dir,
        'tools.staticdir.index': 'index.html',
        #'server.thread_pool': 1, # single thread server.
        'tools.encode.on': True,
        'tools.encode.encoding': 'utf-8',
        'tools.auth.on': _config["auth"]["on"],
        'tools.sessions.on': True,
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
    (static_dir, _config) = reload_config(config_file);
    cherrypy.engine.restart();
cherrypy.engine.signal_handler.handlers[signal.SIGUSR2] = handle_SIGUSR2;
cherrypy.engine.signal_handler.subscribe();

cherrypy.quickstart(root, '/', conf)
