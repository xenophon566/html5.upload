/**
* My Upload Plugin
* 
* @Date 	20140205
* @Author 	ShawnWu
* @Version 	release v3.0.20140227
* @License 	under the MIT License
**/
var html5 = (function(){
	var reader = new FileReader(), queue = [], object = {},
		counter = 0, totalNumber = 0, numSet = 0, sizeSet = 0, sizeTotal = 0, sizeProgress = 0,
		imageMime = ['image/png', 'image/jpeg', 'image/gif', 'image/ief', 'image/tiff', 'image/x-cmu-raster', 'image/x-ms-bmp',
					'image/x-portable-anymap', 'image/x-portable-bitmap', 'image/x-portable-graymap', 'image/x-portable-pixmap',
					'image/x-rgb', 'image/x-xbitmap', 'image/x-xpixmap', 'image/x-xwindowdump'],
		audioMime = ['audio/basic', 'audio/midi', 'audio/mpeg', 'audio/mpegurl', 'audio/x-aiff', 'audio/x-gsm',
					'audio/x-pn-realaudio', 'audio/x-pn-realaudio-plugin', 'audio/x-wav'],
		videoMime = ['video/dl', 'video/fli', 'video/gl', 'video/mpeg', 'video/quicktime', 'video/x-ms-asf', 'video/x-msvideo',
					'video/x-sgi-movie', 'video/avi'],
		textMime = ['text/html', 'text/plain', 'text/mathml', 'text/richtext', 'text/comma-separated-values'];
	
	var settings = {
		uploadArea: '#uploadArea', uploadButton: '#uploadButton', uploadAbort: '#uploadAbort',	//upload element
		mimeTypes: imageMime, mimeStrict: false,	//mimeTypes setting
		numLimit: 100, numLimitTotal: 0,	//number setting
		sizeLimitUni: 0, sizeLimitSet: 0, sizeLimitTotal: 0,	//size setting
		ajaxType: 'POST', ajaxURL: 'imageMaker.php', ajaxCache: true, ajaxData: 'ajaxData',	//Ajax request setting
		dragenter: function(e){}, dragover: function(e){}, dragleave: function(e){}, dropdown: function(e){},	//DnD event setting
		readMethod: 'readAsDataURL',	//FileReader method setting
		startReader: function(e, file){}, progressReader: function(e, file){}, endReader: function(e, file){},
		loadReader: function(e, file){}, abortReader: function(e, file){},	//reader event setting
		startXHR: function(e, file){}, progressXHR: function(e, file){}, endXHR: function(e, file){},
		loadXHR: function(e, file){}, errorXHR: function(e, file){}	//XHR event setting
	};
	
	var initial = function(options) {
		settings = jQuery.extend(settings, options);
		//drag and drop in window
		$(window).bind("dragover", function(e){e.preventDefault()});
		$(window).bind("drop", function(e){e.preventDefault()});
		//drag and drop style
		$(settings.uploadArea).bind("dragenter", settings.dragenter);
		$(settings.uploadArea).bind("dragover", settings.dragover);
		$(settings.uploadArea).bind("dragleave", settings.dragleave);
		$(settings.uploadArea).bind("drop", settings.dropdown);
		//drop or select files
		$(settings.uploadButton).bind("change", function(e){getFiles(e.target.files)});
		$(settings.uploadArea).on("drop", function(e){getFiles(e.originalEvent.dataTransfer.files)});
		//abort the upload
		$(settings.uploadAbort).bind("click", function(){ queue=['']; reader.abort(); totalNumber -= totalNumber-counter; });
    }
	
	var getFiles = function(filelist) {
		if( !filelist || !filelist.length ) return;
		//number limit of upload file
		var list = {}; for( var i in filelist ) list[i] = filelist[i];
		if( settings.numLimitTotal && totalNumber + filelist.length > settings.numLimitTotal ) {
			if( filelist.length != totalNumber + filelist.length - settings.numLimitTotal ) {
				for( var i=0; i<filelist.length-(settings.numLimitTotal-totalNumber); i++ ) {
					for( var key in filelist ) if( key == filelist.length - 1 - i ) delete list[key];
				} list.length = settings.numLimitTotal - totalNumber;
			} else { console.error('Out of Total number'); return; }
		}
		//unit size limit of upload file
        var numStatement = settings.numLimit ? 'i<list.length && i<settings.numLimit' : 'i<list.length',
			sizeStatement = settings.sizeLimitUni ? 'list[i].size < settings.sizeLimitUni' : 'true';
		numSet=0; sizeSet=0; for( var i=0; eval(numStatement); i++ ) {
			if( eval(sizeStatement) ) {
				sizeSet += list[i].size; numSet++;
				queue.push(list[i]);
			} else console.error('Out of Unit size');
        }
		//upload size filter
		if(settings.sizeLimitSet) if( sizeSet > settings.sizeLimitSet ) {
			console.error('Out of Set size'); queue=[]; return;
		} sizeTotal += sizeSet;
		if(settings.sizeLimitTotal) if( sizeTotal > settings.sizeLimitTotal ) {
			console.error('Out of Total size'); sizeTotal -= sizeSet; queue=[]; return;
		} totalNumber += numSet;
		
		sizeProgress = 0; uploadQueue();
    }
	
    var uploadQueue = function() {
		if( queue.length ) {
            var file = queue.shift();
			if( !!~settings.mimeTypes.indexOf(file.type) ) fileUpload(file);
			else if( !settings.mimeStrict && !file.type ) fileUpload(file);
			else { console.error('Wrong or Empty file type'); uploadQueue(); }
        }
    }
	
	var uploadProgress = function(file) {
		sizeProgress += file.size;
		return sizeProgress/sizeSet;
    }
	
    var fileUpload = function(file) {
		eval('reader.'+settings.readMethod+'(file)');
		reader.onloadstart = function(e) { settings.startReader(e, file) };
		reader.onprogress = function(e) { settings.progressReader(e, file) };
		reader.onload = function(e) { settings.loadReader(e, file); counter++; };
		reader.onloadend = function(e) { settings.endReader(e, file); uploadQueue(); };
		reader.onabort = function(e) { settings.abortReader(e, file) };
		if(!file) settings.abortReader(file);
    }
	
	var ajaxTxing = function(ajaxData, file) {
		dataObject = {}; dataObject[settings.ajaxData] = ajaxData;
		$.ajax({
			type: settings.ajaxType,
			url: settings.ajaxURL,
			cache: settings.ajaxCache,
			data: dataObject,
			xhr: function() {
				var xhr = $.ajaxSettings.xhr();
				xhr.upload.onloadstart = function(e){ settings.startXHR(e, file) };
				xhr.upload.onprogress = function(e){ settings.progressXHR(e, file) };
				xhr.upload.onload = function(e){ settings.loadXHR(e, file) };
				xhr.upload.onloadend = function(e){ settings.endXHR(e, file) };
				xhr.upload.onerror = function(e){ settings.errorXHR(e, file); uploadQueue(); };
				return xhr;
			}
		});
	}

	return {
		paras : function(parameter){ return eval(parameter) },
		
		setParas : function(obj){ object = jQuery.extend(object, obj) },
		
		progress : function(file){ return uploadProgress(file) },
		
		upload : function(options){ initial(options) },
		
		ajaxTxing : function(ajaxData, file){ ajaxTxing(ajaxData, file) }
	}
})();
