function Client(settings){
  this.dropbox = new Dropbox.Dropbox(settings);

  var prefix = "ynab";
  this.hasLocalStorageSupport = (function(){
    try {
      var key = "ynab:localStorage:test";
      localStorage.setItem(key, "a");
      localStorage.removeItem(key);
      return true;
    } catch(e) {
      return false;
    }
  })();

  this.download = function (path, method){
    var deferred = new $.Deferred;
    var cached = undefined;//fetchCache(method, path);
    if(cached !== undefined) {
      setTimeout(function(){
        deferred.resolve(cached);        
      }, 10)
    } else {
      this.dropbox[method]({path: '/' + path})
        .then(function (data) {
          if(method == "filesListFolder"){
            console.log("unhandled method, probably..");
            debugger;
          }
          //TODO: maybe split this up for the 2 dropbox methods, dont thinke ListFileFolders will like this..
          console.log("LOAD: I'm here..." + method);
          reader = new FileReader();
          reader.addEventListener("loadend", function(){
            //alert(reader.result);
            pushCache(method, path, reader.result);
            deferred.resolve(reader.result);
          });
          reader.readAsText(data.fileBlob);
          //pushCache(method, path, reader.result);
          //deferred.resolve(reader.result);
        })
        .catch(function (error) {
          deferred.reject(error);
        });
    }

    return deferred;
  }

  // returns: a list of strings of paths in a directory
  this.dirload = function (path, method){
    var deferred = new $.Deferred;
    var cached = undefined;//fetchCache(method, path);
    if(cached !== undefined) {
      setTimeout(function(){
        deferred.resolve(cached);        
      }, 10)
    } else {
      this.dropbox[method]({path: '/' + path})
      .then(function (data) {
        if(method !== "filesListFolder"){
          console.log("unhandled method, probably..");
          debugger;
        }
        debugger;
        // TODO: handle more than one "page", aka keep checking with filesListFolderContinue

        var pathsOnlyArr = [];
        data.entries.forEach(function(element) {
          // Dropbox SDK v1 and v2 have differing ideas on prefixed fwd slash
          var path = element.path_lower.substr(1);
          pathsOnlyArr.push(path);
        });

        pushCache(method, path, pathsOnlyArr);
        deferred.resolve(pathsOnlyArr);
      })
        .catch(function (error) {
          deferred.reject(error);
        });
    }

    return deferred;
  }

  this.loadJson = function(path){
    return this.download(path, "filesDownload").then(function(data){
      return JSON.parse(data);
    });
  }

  this.readDir = function(path){
    return this.dirload(path, "filesListFolder");
  }

  // TODO: unused function
  this.authenticate = function(){
    var deferred = new $.Deferred;
    /*
    this.dropbox.authenticate(function(error, client) {
      if (error) {
        deferred.reject(error);
      }else{
        deferred.resolve(client);
      }
    });
    */

    //deferred.resolve();
    deferred = true;
    return deferred;
  }

  this.flushCache = function() {
    if(this.hasLocalStorageSupport) {
      Object.keys(localStorage).forEach(function(key){
        if(key.indexOf("ynab") === 0) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  var cacheTTL = 5 * 60 * 1000;

  function fetchCache(method, path) {
    if(this.hasLocalStorageSupport) {
      var key = cacheKey(method, path);
      var cached = localStorage[key];
      if(cached) {
        try {
          var parsed = JSON.parse(cached);
          var expired = now() - (cacheTTL + parsed.timestamp) > 0;
          if(expired) {
            localStorage.removeItem(key);
            return undefined;
          } else {
            return parsed.data;
          }
        } catch(e) {}
      }
    }
    return undefined;
  }

  function now(){
    return (new Date).getTime()
  }

  function pushCache(method, path, value) {
    if(this.hasLocalStorageSupport) {
      localStorage[cacheKey(method, path)] = JSON.stringify({ data: value, timestamp: now() });
    }
  }

  function cacheKey(method, path) {
    return [prefix, method, path].join(":");
  }
}
