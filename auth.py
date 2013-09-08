#!/usr/bin/python2.6
#-*- coding: UTF-8 -*-

import sys, time, os, json, traceback, datetime, urllib, random;
import cherrypy, MySQLdb;
from utility import error, trace, get_work_dir, reload_config, send_mail, enable_crossdomain, sql_escape, sql_exec;

SESSION_KEY = '_cp_user_id'

_config = None;
def auth_init(config):
    global _config;
    _config = config;
    
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
        user_id = cherrypy.session.get(SESSION_KEY);
        if user_id is None:
            error("authorize_user invalid, no session.");
            enable_crossdomain();
            raise cherrypy.HTTPError(401, "You are not authorized, login please.");
            return;
        if request_user_id in authorize_get_exception_user_id(user_id):
            error("authorize_user(id=%s) requires user id=%s invalid, check authorization failed."%(user_id, request_user_id));
            enable_crossdomain();
            raise cherrypy.HTTPError(403, "You(id=%s) are not authorized as %s, login please."%(user_id, request_user_id));
            return;
        trace("authorize success, user_id=%s requires id=%s"%(user_id, request_user_id));
            
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
        trace("check session, session_id=%s"%(cherrypy.session.id));
        # check QQ-OAuth session.
        user_id = cherrypy.session.get(SESSION_KEY);
        if user_id is None:
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
            
    trace("check auth success. user_id=%s"%(user_id));
    
# to enable the hook, must enable the config tools.auth.on to True.
cherrypy.tools.auth = cherrypy.Tool('before_handler', check_auth)

'''
if request contains the session_id, hack to set the cookie to enable session
'''
def crossdomain_session(*args, **kwargs):
    # to generate the query string.
    # the on_start_resource handler have not parse the query string.
    cherrypy.request.process_query_string();
        
    # reload session id if request contains api_key session_id.
    if "api_key" in cherrypy.request.params:
        # get the origin session id
        origin_session_id = "";
        if "session_id" in cherrypy.request.cookie:
            origin_session_id = cherrypy.request.cookie["session_id"];
        # update session id
        session_id = cherrypy.request.params["api_key"];
        # remove the session_id in query_string
        cherrypy.request.params.clear();
        cherrypy.request.query_string = cherrypy.request.query_string.replace("api_key="+session_id, "");
        # hack cookie.
        cherrypy.request.cookie["session_id"] = session_id;
        trace("hack cookie session %s to %s"%(origin_session_id, session_id));
        
# to enable the hook, must enable the config tools.crossdomain_session.on to True.
cherrypy.tools.crossdomain_session = cherrypy.Tool('on_start_resource', crossdomain_session)
    
'''
@conditions defines what need to check for method.
'''
def require_auth(*conditions):
    def decorate(f):
        if not hasattr(f, "_cp_config"):
            f._cp_config = {};
        if 'auth.require' not in f._cp_config:
            f._cp_config['auth.require'] = []
        f._cp_config['auth.require'].extend(conditions)
        return f;
    return decorate;
