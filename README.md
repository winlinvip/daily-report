DailyReport
============

Open Source Daily Report, support team time analysis.

## Usage

```
git clone https://github.com/winlinvip/daily-report.git &&
cd daily-report && 
echo "Install depends python modules" && (cd 3rdparty && bash install.sh) &&
echo "Create database for daily report" && mysql -uroot -pyourpwd < daily-report.sql &&
echo "Please modify the config.conf then start daily-report" && ./daily-report.py &&
echo "Success: http://yourserver:3001"
```

## 实例

我的研发团队在2013年和2014使用这个产品后的分析结果。

* 团队一年时间如何分配的
<img src="http://winlinvip.github.io/daily-report/wiki/demo-001.png" title="团队一年时间如何分配的"/>
* 去年和今年相比，在不同的事务上花费的时间比较
<img src="http://winlinvip.github.io/daily-report/wiki/demo-002.png" title="去年和今年相比，在不同的事务上花费的时间比较"/>
* 去年和今年相比，在不同的产品上花费的时间比较
<img src="http://winlinvip.github.io/daily-report/wiki/demo-003.png" title="去年和今年相比，在不同的产品上花费的时间比较"/>
* 去年和今年相比，高层领导的时间花在哪里了
<img src="http://winlinvip.github.io/daily-report/wiki/demo-004.png" title="去年和今年相比，高层领导的时间花在哪里了"/>
* 去年和今年相比，中层干部的时间花在哪里了
<img src="http://winlinvip.github.io/daily-report/wiki/demo-005.png" title="去年和今年相比，中层干部的时间花在哪里了"/>
* 去年和今年相比，基层研发的时间花在哪里了
<img src="http://winlinvip.github.io/daily-report/wiki/demo-006.png" title="去年和今年相比，基层研发的时间花在哪里了"/>
* 去年和今年相比，某个总监的时间安排有什么变化
<img src="http://winlinvip.github.io/daily-report/wiki/demo-007.png" title="去年和今年相比，某个总监的时间安排有什么变化"/>
* 去年和今年相比，某个干部的时间安排有什么变化
<img src="http://winlinvip.github.io/daily-report/wiki/demo-008.png" title="去年和今年相比，某个干部的时间安排有什么变化"/>
* 去年离职的都是些什么类型的同事，领导团队是否稳固
<img src="http://winlinvip.github.io/daily-report/wiki/demo-009.png" title="去年离职的都是些什么类型的同事，领导团队是否稳固"/>
* 今年离职的都是些什么类型的同事，领导团队是否稳固
<img src="http://winlinvip.github.io/daily-report/wiki/demo-010.png" title="今年离职的都是些什么类型的同事，领导团队是否稳固"/>
* 根据离职和在职的同事所花的时间比例，估算团队稳定度
<img src="http://winlinvip.github.io/daily-report/wiki/demo-011.png" title="根据离职和在职的同事所花的时间比例，估算团队稳定度"/>
* 高层领导根据今年的时间分配，调整工作安排，做出明年的宏观工作计划
<img src="http://winlinvip.github.io/daily-report/wiki/demo-012.png" title="高层领导根据今年的时间分配，调整工作安排，做出明年的宏观工作计划"/>
* 中层干部根据今年的时间分配，调整工作安排，做出明年的宏观工作计划
<img src="http://winlinvip.github.io/daily-report/wiki/demo-013.png" title="中层干部根据今年的时间分配，调整工作安排，做出明年的宏观工作计划"/>

Winlin 2013
