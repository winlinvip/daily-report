#!/usr/bin/python2.6
#-*- coding: UTF-8 -*-

import json, datetime;

def parse_config(config_file):
    file = open(config_file);
    conf = file.read();
    file.close();
    return json.loads(conf);
    
_log_config = None;
def initialize_log(log_to_console=True, log_to_file=False, log_file=None):
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