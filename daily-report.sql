drop database if exists os_daily_report;
create database os_daily_report;
use os_daily_report;

drop table if exists dr_product;
create table dr_product( 
    product_id int(32) not null auto_increment, 
    product_name varchar(100) default null, 
    primary key (`product_id`) 
) auto_increment=100 default charset=utf8;

drop table if exists dr_user;
create table dr_user( 
    user_id int(32) not null auto_increment, 
    user_name varchar(200) default null,  
    primary key (`user_id`) 
) auto_increment=200 default charset=utf8;

drop table if exists dr_type;
create table dr_type( 
    type_id int(32) not null auto_increment, 
    type_name varchar(200) default null,   
    primary key (`type_id`) 
) auto_increment=300 default charset=utf8;

drop table if exists dr_report;
create table dr_report( 
    report_id int(32) not null auto_increment, 
    product_id int(32) not null, 
    user_id int(32) not null, 
    type_id int(32) not null, 
    bug_id int(32) not null, 
    work_hours double not null, 
    priority double not null, 
    report_content varchar(5000),
    work_date datetime not null,
    insert_date datetime not null,
    modify_date datetime not null,
    primary key (`report_id`) 
) auto_increment=400 default charset=utf8;

drop table if exists dr_group;
create table dr_group( 
    group_id int(32) not null auto_increment, 
    group_name varchar(100) not null,
    primary key (`group_id`) 
) auto_increment=500 default charset=utf8;

drop table if exists dr_rs_group_user;
create table dr_rs_group_user( 
    rs_group_user_id int(32) not null auto_increment, 
    group_id int(32) not null, 
    user_id int(32) not null, 
    primary key (`rs_group_user_id`) 
) auto_increment=600 default charset=utf8;

drop table if exists dr_authenticate;
create table dr_authenticate( 
    auth_id int(32) not null auto_increment, 
    user_id int(32) not null, 
    qq_oauth_access_token varchar(200) default null,  
    qq_oauth_openid varchar(200) default null,
    primary key (`auth_id`) 
) auto_increment=700 default charset=utf8;

-- to show the manager role, the manager can manage some user.
drop table if exists dr_authorize_manger;
create table dr_authorize_manger( 
    auth_id int(32) not null auto_increment, 
    manager_id int(32) not null, 
    user_id int(32) not null, 
    primary key (`auth_id`) 
) auto_increment=800 default charset=utf8;

-- to show the admin role, the admin can access all user and resource.
drop table if exists dr_authorize_admin;
create table dr_authorize_admin( 
    auth_id int(32) not null auto_increment, 
    user_id int(32) not null, 
    primary key (`auth_id`) 
) auto_increment=900 default charset=utf8;

-- update history
-- 2013-8-27
-- alter table dr_report add modify_date datetime not null;
-- 2013-9-1
-- alter table dr_report add priority double not null;
-- 2013-9-3
-- alter table dr_user add email varchar(200) null;
-- 2013-9-5
-- create table dr_authenticate;
-- create table dr_authorize_manger;
-- create table dr_authorize_admin;
-- 2013-9-6
-- alter table dr_authenticate drop qq_oauth_id;
-- alter table dr_authenticate add qq_oauth_openid varchar(200);