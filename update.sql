use os_daily_report;

set names utf8;

-- 1.0.1, add the enabled field for user.
ALTER TABLE `dr_user` add column `enabled` boolean DEFAULT true;

-- 2.0.0, create index.
ALTER TABLE `dr_report` ADD INDEX product_id_index (`product_id`);
ALTER TABLE `dr_report` ADD INDEX user_id_index (`user_id`);
ALTER TABLE `dr_report` ADD INDEX type_id_index (`type_id`);
ALTER TABLE `dr_report` ADD INDEX bug_id_index (`bug_id`);
ALTER TABLE `dr_report` ADD INDEX work_hours_index (`work_hours`);
ALTER TABLE `dr_report` ADD INDEX priority_index (`work_hours`);
ALTER TABLE `dr_report` ADD INDEX work_date_index (`work_date`);
ALTER TABLE `dr_report` ADD INDEX insert_date_index (`insert_date`);
ALTER TABLE `dr_report` ADD INDEX modify_date_index (`modify_date`);

