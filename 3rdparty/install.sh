#!/bin/bash

dir=`pwd` &&
echo "install cherrypy" &&
cd $dir &&
sudo rm -rf CherryPy-3.2.2 &&
unzip -q CherryPy-3.2.2.zip &&
cd CherryPy-3.2.2 &&
sudo python setup.py install &&
echo "install tools for bulding mysql-python" &&
sudo yum install -y mysql-devel python-devel &&
echo "install mysql-python" &&
cd $dir &&
sudo rm -rf MySQL-python-1.2.3c1 &&
unzip -q MySQL-python-1.2.3c1.zip &&
cd MySQL-python-1.2.3c1 &&
sudo python setup.py install