use os_daily_report;

set names utf8;

-- users: 200
insert into dr_user (user_name) values("杨成立");

-- products: 100
insert into dr_product(product_name) values("Player");

-- work item type: 300
insert into dr_type(type_name) values("代码编写");

-- group: 500
insert into dr_group(group_name) values("客户端");

-- group-user relationship: 600
-- group: 客户端
insert into dr_rs_group_user(group_id, user_id) values(500, 200);
