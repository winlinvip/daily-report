use os_daily_report;

set names utf8;

-- 1.0.1, add the enabled field for user.
ALTER TABLE `dr_user` add column `enabled` boolean DEFAULT true;

