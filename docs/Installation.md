# Raspbian Stretch Packages Required

## libatlas (dependency for sklearn)
```
sudo apt-get update  
sudo apt-get install libatlas-base-dev
```

## obspy python module
```
deb http://deb.obspy.org stretch main  
wget --quiet -O - https://raw.github.com/obspy/obspy/master/misc/debian/public.key | sudo apt-key add -  
sudo apt-get update  
sudo apt-get install python3-obspy  
```

## sklearn python module
```
sudo apt-get install python3-sklearn
```

## pandas python module
```
sudo apt-get install python3-pandas
```

## Other required python modules (install using `pip3 install <module>`)
- pyserial
- bluepy
- statsmodels
- sklearn
- pandas
- pymongo
- server_auth
- RPi.GPIO
- smbus