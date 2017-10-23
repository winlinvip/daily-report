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

## MacOS

下面是在MacOS安装单机版.

**Step 1:** 先获取代码:

```
git clone https://github.com/winlinvip/daily-report.git &&
cd daily-report
```


**Step 2:** 然后在本机安装MySQl(MariaDB):

```
brew install -y mariadb && brew services start mariadb
```

可以看到Brew安装了服务, 会在每次启动时自动启动MySQL数据库:

```
Mac:winlin$ brew services list
Name    Status  User        Plist
mariadb started chengli.ycl /Users/winlin/Library/LaunchAgents/homebrew.mxcl.mariadb.plist
```

**Step 3:** 执行数据库脚本, 创建数据库(默认root没有密码), 创建默认数据:

```
mysql -uroot < daily-report.sql &&
mysql -uroot < default-values.sql
```

> Remark: 默认MySQL的root没有密码, 如果有密码用`-pPassword`指定, 注意没有空格.

> Remark: 如果MySQL需要指定用户和密码, 修改配置文件`config.conf`的`mysql`配置信息.

> Remark: 默认的用户, 产品和类型, 都可以在启动后后台页面修改.

**Step 4:** 安装依赖的Python库:

```
(cd 3rdparty && bash install.sh)
```

**Step 5:** 启动服务:

```
nohup python daily-report.py >/dev/null 2>&1 &
```

> Remark: MacOS不知道怎么添加系统服务, 每次登陆后需要手动执行上面的脚本.

访问页面就可以填日报和管理系统: http://localhost:3001

## Show

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
