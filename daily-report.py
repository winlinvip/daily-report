#!/usr/bin/python2.6
#-*- coding: UTF-8 -*-

import sys;
import cherrypy
import time;
import os;
import json;
import traceback;
import MySQLdb;
import datetime;
#send maill
import smtplib
from email.mime.text import MIMEText
from email.header import Header

# set the default encoding to utf-8
# reload sys model to enable the getdefaultencoding method.
reload(sys);
# using exec to set the encoding, to avoid error in IDE.
exec("sys.setdefaultencoding('utf-8')");
assert sys.getdefaultencoding().lower() == "utf-8";

def write_log(level, msg):
    time = str(datetime.datetime.now());
    msg = "[%s][%s] %s"%(time, level, msg);
    print(msg);
    f = open("daily_report.log", "a+"); f.write("%s\n"%(msg)); f.close();
def error(msg):
    write_log("error", msg);
def trace(msg):
    write_log("trace", msg);

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
        return cursor.fetchall();
    finally:
        if cursor is not None: cursor.close();
        if conn is not None: conn.close();

def enable_crossdomain():
    cherrypy.response.headers["Access-Control-Allow-Origin"] = "*";
    cherrypy.response.headers["Access-Control-Allow-Methods"] = "GET, POST, HEAD, PUT, DELETE";
    cherrypy.response.headers["Access-Control-Allow-Headers"] = "Cache-Control, X-Proxy-Authorization, X-Requested-With, Content-Type";

class RESTGroup(object):
    exposed = True;

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

    def GET(self, group=""):
        enable_crossdomain();
        
        if group == "":
            records = sql_exec("select user_id,user_name from dr_user");
        else:
            records = sql_exec("select u.user_id,u.user_name "
                "from dr_user u,dr_group g,dr_rs_group_user rs "
                "where rs.user_id = u.user_id and g.group_id = rs.group_id and g.group_id = %s"%(group));
            
        ret = [];
        for record in records:
            ret.append({"id":record[0], "value":record[1]});
        return json.dumps(ret);
        
    def OPTIONS(self):
        enable_crossdomain();

def parse_config():
    file = open("config.conf");
    conf = file.read();
    trace(conf);
    file.close();
    return json.loads(conf);
    
import urllib;
class RESTRedmine(object):
    exposed = True;

    def GET(self, issue_id):
        enable_crossdomain();
        # read config from file.
        redmine_api_issues = _config["redmine_api_issues"]
        # proxy for redmine issues
        # 1. must Enable the RESTful api: http://www.redmine.org/projects/redmine/wiki/Rest_api#Authentication
        # 2. add a user, username="restful", password="restful", add to report user, which can access the issues.
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
        sql = "select %s from %s where true"%("report_id,product_id,user_id,type_id,bug_id,work_hours,report_content,work_date,insert_date", "dr_report");
        sql = self.build_sql_conditions(sql, start_time, end_time, user_id, product_id, type_id);
        sql = "%s %s"%(sql, "order by dr_report.report_id asc");

        records = sql_exec(sql);
        ret = [];
        
        for record in records:
            ret.append({
                "report_id":record[0], "product_id":record[1], "user_id":record[2], 
                "type_id":record[3], "bug_id":record[4], "work_hours":record[5], 
                "report_content":record[6], "work_date":str(record[7]), "insert_date":str(record[8])
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
            "report_id,product_id,u.user_id,type_id,bug_id,work_hours,report_content,work_date,insert_date", 
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
                "report_content":record[6], "work_date":str(record[7]), "insert_date":str(record[8])
            });
        
        return json.dumps(ret);
        
    def GET(self, group="", start_time="", end_time="", summary="", user_id="", product_id="", type_id=""):
        enable_crossdomain();
        
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

    def POST(self):
        enable_crossdomain();
        req_json_str = cherrypy.request.body.read();

        try:
            req_json = json.loads(req_json_str);
        except Exception,e:
            error(sys.exc_info);
            return json.dumps({"error_code":ErrorCode.fail,"description":"to json error"});
        
        user_id = sql_escape(req_json["user"]);
        work_date = sql_escape(req_json["date"]);
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
            product_id = sql_escape(item["product"]);
            type_id = sql_escape(item["work_type"]);
            bug_id = sql_escape(item["bug_id"]);
            report_content = sql_escape(item["content"]);
            work_hours = sql_escape(item["time"]);
            if report_id != "" and report_id != 0:
                ret = sql_exec("update dr_report set product_id='%s', user_id='%s', type_id='%s', bug_id='%s', work_hours='%s', report_content='%s', work_date='%s' where report_id='%s'"
                        %(product_id, user_id, type_id, bug_id, work_hours, report_content, work_date, report_id));
            else:
                ret = sql_exec("insert into dr_report (product_id, user_id, type_id, bug_id, work_hours, report_content, work_date, insert_date) values('%s', '%s', '%s', '%s', '%s', '%s', '%s', %s)"
                        %(product_id, user_id, type_id, bug_id, work_hours, report_content, work_date, "now()"));

        return json.dumps({"error_code":0, "desc":"success"});
        
    def OPTIONS(self):
        enable_crossdomain();

class StaticFile(object):
    exposed = True
    def __init__(self, filename):
        self.filename = filename;
    def GET(self):
        file = open(self.filename);
        data = file.read();
        file.close();
        
        # set the static file to right content type, to fix the warning for browser intrepreting the file.
        if self.filename.endswith(".png"):
            cherrypy.response.headers["Content-Type"] = "image/png";
        elif self.filename.endswith(".js"):
            cherrypy.response.headers["Content-Type"] = "application/javascript";
        else:
            cherrypy.response.headers["Content-Type"] = "text/html";
            
        return data;

class UI(object):
    exposed = True;
    def __getattr__(self, name):
        exts = ['', '.js', '.html', '.png'];
        for ext in exts:
            name_without_ext = name.replace(ext.replace(".", "_"), "");
            file_name = os.path.join("ui", "%s%s"%(name_without_ext, ext));
            if os.path.exists(file_name):
                    return StaticFile(file_name);
        return object.__getattr__(name);

class Root(object):
    exposed = True;
    def GET(self):
        raise cherrypy.HTTPRedirect("ui");

# global config.
_config = parse_config();
# generate js conf by config
if True:
    js_config = _config["js_config"];
    f = open("ui/conf.js", "w");
    for js in js_config:
        f.write("%s\n"%(js));
    f.close();

root = Root();
root.ui = UI();
root.redmines = RESTRedmine();
root.reports = RESTDailyReport();
root.users = RESTUser();
root.products = RESTProduct();
root.groups = RESTGroup();
root.work_types = RESTWorkType();
conf = {
    'global': {
        'server.socket_host': '0.0.0.0',
        'server.socket_port': 3001,
        #'server.thread_pool': 1, # single thread server.
        'tools.encode.on': True,
        'tools.encode.encoding': 'utf-8',
    },
    '/': {
        'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
    }
}

cherrypy.quickstart(root, '/', conf)
