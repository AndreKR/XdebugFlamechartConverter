# Xdebug Flamechart Converter

Converts an [Xdebug profile](http://www.xdebug.org/docs/profiler) to a .cpuprofile file that can be viewed as a flamechart with Chrome Developer Tools.

## Link

http://andrekr.github.io/XdebugFlamechartConverter/profile_converter.html

## How to use

* Create a profile with Xdebug (see [here](http://www.xdebug.org/docs/profiler#starting) and (for web pages) [here](https://chrome.google.com/webstore/detail/xdebug-helper/eadndfjplgieldjbigjakmdgkmoaaaoc)) 
* Open the [Converter](http://andrekr.github.io/XdebugFlamechartConverter/profile_converter.html) in a browser
* Drop the Cachegrind file onto that page, a download will start
* Open Developer Tools (F12), go to Profiles Tab
* Click "Load" and load the downloaded file

![Screenshot](http://andrekr.github.io/XdebugFlamechartConverter/screenshot.png)

## Limitations

* Xdebug does not give information about *when*, within one function, another function is called. The Flamechart Converter just shows all called functions in the middle of each calling function
* Xdebug stores the durations with a relatively low resolution (the unit is 10 µs, effectively the resolution is lower), so many small functions end up with a time of 0. To make them visible in the flamechart, the Converter shows them with 100 ns. Theoretically, when a function makes thousands of small function calls but has no *self* time, this can increase the displayed duration of that function a bit.
