use os_daily_report;

set names utf8;

-- users
insert into dr_user (user_name) values("杨成立");
insert into dr_user (user_name) values("傅祝易");
insert into dr_user (user_name) values("雷健");
insert into dr_user (user_name) values("罗静敏");
insert into dr_user (user_name) values("董运楼");

-- products
insert into dr_product(product_name) values("BravoServer");
insert into dr_product(product_name) values("VMS");
insert into dr_product(product_name) values("Player");

-- work item type
insert into dr_type(type_name) values("代码编写");
insert into dr_type(type_name) values("开会");