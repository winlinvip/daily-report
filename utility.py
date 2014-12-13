#!/usr/bin/python2.6
#-*- coding: UTF-8 -*-

import os,sys,json, datetime;
import cherrypy, MySQLdb;

_config = None;
def utility_init(config):
    global _config;
    _config = config;

_log_config = None;
def _initialize_log(log_to_console=True, log_to_file=False, log_file=None):
    global _log_config;
    _log_config = {};
    _log_config["log_to_console"] = log_to_console;
    _log_config["log_to_file"] = log_to_file;
    _log_config["log_file"] = log_file;
    
def error(msg):
    _write_log("error", msg);
def trace(msg):
    _write_log("trace", msg);
    
def _write_log(level, msg):
    global _log_config;
    assert(_log_config is not None);
    # generate msg
    time = str(datetime.datetime.now());
    msg = "[%s][%s] %s"%(time, level, msg);
    # write msg
    if _log_config["log_to_console"]:
        print(msg);
    if _log_config["log_to_file"]:
        log_file = _log_config["log_file"];
        assert(log_file is not None);
        f = open(log_file, "a+"); f.write("%s\n"%(msg)); f.close();
        
'''
get the abs work dir.
'''
def get_work_dir():
    return os.path.abspath(os.path.dirname(sys.argv[0]));
    
'''
reload config from config file.
'''
def reload_config(config_file, js_file_path, version):
    # global config.
    _config = _parse_config(config_file);
    _initialize_log(_config["log"]["log_to_console"], _config["log"]["log_to_file"], _config["log"]["log_file"]);
    trace(json.dumps(_config, indent=2));
    
    work_dir = get_work_dir();
    
    log = _config["log"];
    trace("work_dir=%s, port=%s, log=%s(file:%s, console:%s)"
        %(work_dir, _config["system"]["port"], log["log_file"], log["log_to_console"], log["log_to_file"]));
        
    # generate js conf by config
    _generate_js_config_file(_config, js_file_path, version);
        
    return _config;

def _parse_config(config_file):
    file = open(config_file);
    conf = file.read();
    file.close();
    return json.loads(conf);
        
def _generate_js_config_node(nodes, _config):
    if type(nodes) is not dict:
        return "";
        
    js_functions = "";
    
    for name in nodes:
        if str(name) != "js_config":
            js_functions += _generate_js_config_node(nodes[name], _config);
            continue;
        js_function = nodes[name];
        for name in js_function:
            js_functions += "function %s{\n"%(name);
            js_body = str(js_function[name])
            js_body = js_body.replace("{system.port}", str(_config["system"]["port"]));
            js_body = js_body.replace("{redmine.protocol}", str(_config["redmine"]["protocol"]));
            js_body = js_body.replace("{redmine.host}", str(_config["redmine"]["host"]));
            js_body = js_body.replace("{redmine.port}", str(_config["redmine"]["port"]));
            bodies = js_body.split(";")
            for body in bodies:
                if body == "":
                    continue;
                js_functions += "    %s;\n"%(body.strip());
            js_functions += "}\n";
            
    return js_functions;
            
def _generate_js_config_file(_config, js_file_path, version):
    # generate config from exists config.
    if "js_config" not in _config:
        _config["js_config"] = {};
    # generate additional js config
    if _config["auth"]["on"] and _config["auth"]["strategy"] == "qq_oauth":
        _config["js_config"]["enable_auth()"] = "return true;";
        _config["js_config"]["get_qq_oauth_app_id()"] = "return '" + _config["auth"]["qq_oauth_api_app_id"] + "';";
        _config["js_config"]["get_qq_oauth_redirect_url()"] = "return '" + _config["auth"]["qq_oauth_api_redirect_url"] + "'";
    else:
        _config["js_config"]["enable_auth()"] = "return false;";
        _config["js_config"]["get_qq_oauth_app_id()"] = "return 'xxx';";
        _config["js_config"]["get_qq_oauth_redirect_url()"] = "return 'http://xxx';";

    js_functions = "";

    # use angularjs ui.
    if "angularjs" in _config["ui"] and _config["ui"]["angularjs"]:
        js_functions += "var use_angularjs = true;\n"
    else:
        js_functions += "var use_angularjs = false;\n"

    # system version
    js_functions += 'var version = "%s";\n'%version
    
    # foreach all nodes, write the js_config node to file.
    # the js_config must be a array which contains js fucntions.
    js_functions += _generate_js_config_node(_config, _config);
        
    f = open(js_file_path, "w");
    f.write(js_functions);
    f.close();
    
    trace("generated js functions: \n%s"%(js_functions));

import smtplib
from email.mime.text import MIMEText
def send_mail(smtp_server, username, password, to_user, cc_user, subject, content):
    msg = MIMEText(content, _subtype='html', _charset='utf-8');
    msg['Subject'] = subject;
    msg['From'] = username;
    msg['To'] = ";".join(to_user);
    msg['Cc'] = ";".join(cc_user);

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

def enable_crossdomain():
    cherrypy.response.headers["Access-Control-Allow-Origin"] = "*";
    cherrypy.response.headers["Access-Control-Allow-Methods"] = "GET, POST, HEAD, PUT, DELETE";
    # generate allow headers.
    allow_headers = ["Cache-Control", "X-Proxy-Authorization", "X-Requested-With", "Content-Type"];
    cherrypy.response.headers["Access-Control-Allow-Headers"] = ",".join(allow_headers);
    
def sql_exec(sql, params = None, get_inserted_id=False):
    (conn, cursor) = (None, None);
    
    try:
        mysql_config = _config["mysql"];
        trace("connect to mysql, config=%s"%(mysql_config));
        
        host = mysql_config["host"];
        user = mysql_config["user"];
        passwd = mysql_config["passwd"];
        db = mysql_config["db"];
        
        conn = MySQLdb.connect(host, user, passwd, db, charset='utf8');
        cursor = conn.cursor(MySQLdb.cursors.DictCursor);
        
        trace("execute sql: %s params: %s"%(sql, params));
        if params is not None:
            cursor.execute(sql, params);
        else:
            cursor.execute(sql);

        if get_inserted_id:
            ret = conn.insert_id();
        else:
            ret = cursor.fetchall();
        
        # for windows mysql, commit changes.
        conn.commit();
        
        return ret;
    finally:
        if cursor is not None: 
            cursor.close();
        if conn is not None: 
            conn.close();
