# XdebugTimelineConverter

Converts an [Xdebug profile](http://www.xdebug.org/docs/profiler) to a .cpuprofile file that can be viewed as a flamechart with Chrome Developer Tools.

## How to use

* Create a profile with Xdebug (see http://www.xdebug.org/docs/profiler#starting and (for web pages) https://chrome.google.com/webstore/detail/xdebug-helper/eadndfjplgieldjbigjakmdgkmoaaaoc) 
* Open timeline_converter.html in a browser
* Drop the Cachegrind file onto that page, a download will start
* Open Developer Tools (F12), go to Profiles Tab
* Click "Load" and load the downloaded file
