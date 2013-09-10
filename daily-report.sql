DROP DATABASE IF EXISTS os_daily_report;
CREATE DATABASE os_daily_report;
USE os_daily_report;

DROP TABLE IF EXISTS `dr_product`;
CREATE TABLE `dr_product`( 
    `product_id` int(32) NOT NULL AUTO_INCREMENT, 
    `product_name` varchar(100) DEFAULT NULL, 
    PRIMARY KEY (`product_id`)
) AUTO_INCREMENT=100 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `dr_user`;
CREATE TABLE `dr_user`( 
    `user_id` int(32) NOT NULL AUTO_INCREMENT, 
    `user_name` varchar(200) NOT NULL,  
    `email` varchar(200) DEFAULT NULL,
    PRIMARY KEY (user_id`) 
) AUTO_INCREMENT=200 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `dr_type`;
CREATE TABLE `dr_type`( 
    `type_id` int(32) NOT NULL AUTO_INCREMENT, 
    `type_name` varchar(200) DEFAULT NULL,   
    PRIMARY KEY (`type_id`) 
) AUTO_INCREMENT=300 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `dr_report`;
CREATE TABLE `dr_report`( 
    `report_id` int(32) NOT NULL AUTO_INCREMENT, 
    `product_id` int(32) NOT NULL, 
    `user_id` int(32) NOT NULL, 
    `type_id` int(32) NOT NULL, 
    `bug_id` int(32) NOT NULL, 
    `work_hours` double NOT NULL, 
    `priority` double NOT NULL, 
    `report_content` varchar(5000) NOT NULL,
    `work_date` datetime NOT NULL,
    `insert_date` datetime NOT NULL,
    `modify_date` datetime NOT NULL,
    PRIMARY KEY (`report_id`) 
) AUTO_INCREMENT=400 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `dr_group`;
CREATE TABLE `dr_group`( 
    `group_id` int(32) NOT NULL AUTO_INCREMENT, 
    `group_name` varchar(100) NOT NULL,
    PRIMARY KEY (`group_id`) 
) AUTO_INCREMENT=500 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `dr_rs_group_user`;
CREATE TABLE `dr_rs_group_user`( 
    `rs_group_user_id` int(32) NOT NULL AUTO_INCREMENT, 
    `group_id` int(32) NOT NULL, 
    `user_id` int(32) NOT NULL, 
    PRIMARY KEY (`rs_group_user_id`) 
) AUTO_INCREMENT=600 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `dr_authenticate`;
CREATE TABLE `dr_authenticate`( 
    `auth_id` int(32) NOT NULL AUTO_INCREMENT, 
    `user_id` int(32) NOT NULL, 
    `qq_oauth_access_token` varchar(200) DEFAULT NULL,  
    `qq_oauth_openid` varchar(200) DEFAULT NULL,
    PRIMARY KEY (`auth_id`) 
) AUTO_INCREMENT=700 DEFAULT CHARSET=utf8;

-- to show the manager role, the manager can manage some user.
DROP TABLE IF EXISTS `dr_authorize_manager`;
CREATE TABLE `dr_authorize_manager`( 
    `auth_id` int(32) NOT NULL AUTO_INCREMENT, 
    `manager_id` int(32) NOT NULL, 
    `user_id` int(32) NOT NULL, 
    PRIMARY KEY (`auth_id`) 
) AUTO_INCREMENT=800 DEFAULT CHARSET=utf8;

-- to show the admin role, the admin can access all user and resource.
DROP TABLE IF EXISTS `dr_authorize_admin`;
CREATE TABLE `dr_authorize_admin`( 
    `auth_id` int(32) NOT NULL AUTO_INCREMENT, 
    `user_id` int(32) NOT NULL, 
    PRIMARY KEY (`auth_id`) 
) AUTO_INCREMENT=900 DEFAULT CHARSET=utf8;

-- update history
-- 2013-8-27
-- ALTER TABLE dr_report add modify_date datetime NOT NULL;
-- 2013-9-1
-- ALTER TABLE dr_report add priority double NOT NULL;
-- 2013-9-3
-- ALTER TABLE dr_user add `email` varchar(200) NULL;
-- 2013-9-5
-- CREATE TABLE dr_authenticate;
-- CREATE TABLE dr_authorize_manger;
-- CREATE TABLE dr_authorize_admin;
-- 2013-9-6
-- ALTER TABLE dr_authenticate DROP qq_oauth_id;
-- ALTER TABLE dr_authenticate add qq_oauth_openid varchar(200);
-- 2013-9-7
-- rename TABLE dr_authorize_manger to dr_authorize_manager;