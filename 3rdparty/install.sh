#!/bin/bash

OS=`python -mplatform 2>&1`
MACOS=NO && CENTOS=NO && UBUNTU=NO
echo $OS|grep -i "darwin" && MACOS=YES
echo $OS|grep -i "centos" && CENTOS=YES
echo $OS|grep -i "redhat" && CENTOS=YES
echo $OS|grep -i "ubuntu" && UBUNTU=YES
echo "OS is $OS(Darwin:$MACOS, CentOS:$CENTOS, Ubuntu:$UBUNTU)"

if [[ $CENTOS == YES ]]; then
    echo "install tools for bulding mysql+python" &&
    sudo yum install -y mysql-devel python-devel
    ret=$? && if [[ $ret -ne 0 ]]; then echo "devel error $ret"; exit $ret; fi
fi

dir=`pwd` &&
echo "install cherrypy" &&
cd $dir &&
rm -rf CherryPy-3.2.2 &&
unzip -q CherryPy-3.2.2.zip &&
cd CherryPy-3.2.2 &&
python setup.py install --user --prefix= &&
echo "install mysql-python" &&
cd $dir &&
rm -rf mysqlclient-python-1.3.12 &&
tar xf mysqlclient-python-1.3.12.tar.gz &&
cd mysqlclient-python-1.3.12 &&
python setup.py install --user
ret=$? && if [[ $ret -ne 0 ]]; then echo "cherrypy+mysql error $ret"; exit $ret; fi
