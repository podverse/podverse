#!/bin/bash

git checkout v5-alpha
git pull origin develop
git push origin v5-alpha
git checkout develop
