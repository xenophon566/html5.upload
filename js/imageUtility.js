/**
* My Upload Plugin - Image Utility Tool Kit (Canvas)
*
* @Date 	20140205
* @Author 	ShawnWu
* @Version 	release v4.0.20160225
* @Describe upload image example
* @License 	under the MIT License
**/
var imageUtility = (function(){
	var imgObj = [], imgReSize = [],   // image size arrays
        pQueue = [], pCnt = 0, pLock = true,    // file queues
        uploadCounter = 0,      // upload files counter
        photoSizeArr = [];      // upload files size array

	var resizeMAX = function(MAX_WIDTH, MAX_HEIGHT, width, height) {
		var ratio = 1; if( !width || !height ) return;
		if( MAX_WIDTH && MAX_HEIGHT ) {
			if( width > height ) {
				if( width > MAX_WIDTH ) { ratio = MAX_WIDTH/width; height *= MAX_WIDTH/width; width = MAX_WIDTH; }
			} else {
				if( height > MAX_HEIGHT ) { ratio = MAX_HEIGHT/height; width *= MAX_HEIGHT/height; height = MAX_HEIGHT; }
			}
		} else if( MAX_WIDTH && !MAX_HEIGHT ) {
			if( width > MAX_WIDTH ) { ratio = MAX_WIDTH/width; height *= MAX_WIDTH/width; width = MAX_WIDTH; }
		} else if( !MAX_WIDTH && MAX_HEIGHT ) {
			if( height > MAX_HEIGHT ) { ratio = MAX_HEIGHT/height; width *= MAX_HEIGHT/height; height = MAX_HEIGHT; }
		}
		return [ratio, width, height];
	}

	var resizeMIN = function(MIN_WIDTH, MIN_HEIGHT, width, height) {
		var ratio = 1; if( !width || !height ) return;
		if( MIN_WIDTH && MIN_HEIGHT ) {
			if( width < height ) {
				if( width < MIN_WIDTH ) { ratio = MIN_WIDTH/width; height *= MIN_WIDTH/width; width = MIN_WIDTH; }
			} else {
				if( height < MIN_HEIGHT ) { ratio = MIN_HEIGHT/height; width *= MIN_HEIGHT/height; height = MIN_HEIGHT; }
			}
		} else if( MIN_WIDTH && !MIN_HEIGHT ) {
			if( width < MIN_WIDTH ) { ratio = MIN_WIDTH/width; height *= MIN_WIDTH/width; width = MIN_WIDTH; }
		} else if( !MIN_WIDTH && MIN_HEIGHT ) {
			if( height < MIN_HEIGHT ) { ratio = MIN_HEIGHT/height; width *= MIN_HEIGHT/height; height = MIN_HEIGHT; }
		}
		return [ratio, width, height];
	}

	var drawRotated = function(image, cv, ctx, scale, degrees) {
        if(degrees == 90 || degrees == -90) { var tmp = cv.width; cv.width = cv.height; cv.height = tmp; }
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.save();
        ctx.translate(cv.width/2, cv.height/2);
        ctx.rotate(degrees * Math.PI/180);
        ctx.drawImage(image, 0, 0, image.width, image.height, -scale[1]/2, -scale[2]/2, scale[1], scale[2]);
        ctx.restore();
    }

    var normalQuality = function(image, scale, object) {
        var resultCV = document.createElement("canvas"); resultCV.width = scale[1] || 55; resultCV.height = scale[2] || 55;
        var ctx = resultCV.getContext("2d");
        if(object.canvasRotate) drawRotated(image, resultCV, ctx, scale, imageUtility.photoDegree(object.imgExif[2]));
        else ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, scale[1], scale[2]);
        return resultCV;
    }

	var fineQuality = function(image, scale, object) {
		//get source and target canvas
		var scaleArr = scale;
        var scale = scale[0];
        var cv = document.createElement("canvas"); cv.width = image.width; cv.height = image.height;
			cv.getContext("2d").drawImage(image, 0, 0);
		var sq = scale*scale,	//pixel of source within target
			sw = cv.width, sh = cv.height,	//source width height
			sx = 0, sy = 0, sIdx = 0,	//source x y and pixel index of source array
			tw = Math.floor(sw * scale), th = Math.floor(sh * scale),	//target width height
			tx = 0, ty = 0, tIdx = 0,	//target x y and pixel index of target array
			TX = 0, TY = 0, yIdx = 0,	//rounded tx ty
			w = 0, nw = 0, wx = 0, nwx = 0, wy = 0, nwy = 0,	//weight / next weight x / y
			sR = 0, sG = 0, sB = 0,	//source RGB
			crossX = false, crossY = false,	//scaled px cross current px border
			sBuffer = cv.getContext("2d").getImageData(0, 0, sw, sh).data,	//get source buffer 8 bit rgba
			tBuffer = new Float32Array(3 * sw * sh); //put target buffer Float32 rgb

		//create result canvas
		var resultCV = document.createElement("canvas"); resultCV.width = tw; resultCV.height = th;
		var resultCTX = resultCV.getContext("2d"),	//canvas result context
			resultIMG = resultCTX.getImageData(0, 0, tw, th),	//result image
			tByteBuffer = resultIMG.data,	//result image buffer
			pxIndex = 0;	//number of total pixel

		//RGB of source to target
		for( sy=0; sy<sh; sy++ ) {
			ty = sy * scale; TY = 0 | ty; yIdx = 3 * TY * tw; crossY = (TY != (0 | ty + scale));
			if(crossY) {
				wy = (TY + 1 - ty);
				nwy = (ty + scale - TY - 1);
			}
			for( sx=0; sx<sw; sx++, sIdx+=4 ) {
				tx = sx * scale; TX = 0 | tx; tIdx = yIdx + TX * 3; crossX = (TX != (0 | tx + scale));
				if(crossX) {
					wx = (TX + 1 - tx);
					nwx = (tx + scale - TX - 1);
				}
				//image refined
				sR = sBuffer[sIdx+0]; sG = sBuffer[sIdx+1]; sB = sBuffer[sIdx+2];	//get source RGB
				if(!crossX && !crossY) {	//NO pixel cross
					tBuffer[tIdx+0] += sR * sq; tBuffer[tIdx+1] += sG * sq; tBuffer[tIdx+2] += sB * sq;
				} else if(crossX && !crossY) { //X cross only
					w = wx * scale;		//add weighted component for current px
					tBuffer[tIdx+0] += sR * w; tBuffer[tIdx+1] += sG * w; tBuffer[tIdx+2] += sB * w;
					nw = nwx * scale	//add weighted component for next (TX+1) px
					tBuffer[tIdx+3] += sR * nw; tBuffer[tIdx+4] += sG * nw; tBuffer[tIdx+5] += sB * nw;
				} else if(crossY && !crossX) { //Y cross only
					w = wy * scale;		//add weighted component for current px
					tBuffer[tIdx+0] += sR * w; tBuffer[tIdx+1] += sG * w; tBuffer[tIdx+2] += sB * w;
					nw = nwy * scale	//add weighted component for next (TY+1) px
					tBuffer[tIdx+3 * tw+0] += sR * nw; tBuffer[tIdx+3 * tw+1] += sG * nw; tBuffer[tIdx+3 * tw+2] += sB * nw;
				} else {	//XY cross both
					w = wx * wy;	//add weighted component for current px
					tBuffer[tIdx+0] += sR * w; tBuffer[tIdx+1] += sG * w; tBuffer[tIdx+2] += sB * w;
					nw = nwx * wy;	//for TX + 1; TY px
					tBuffer[tIdx+3] += sR * nw; tBuffer[tIdx+4] += sG * nw; tBuffer[tIdx+5] += sB * nw;
					nw = nwy * wx;	//for TX ; TY + 1 px
					tBuffer[tIdx+3 * tw+0] += sR * nw; tBuffer[tIdx+3 * tw+1] += sG * nw; tBuffer[tIdx+3 * tw+2] += sB * nw;
					nw = nwx * nwy;	//for TX + 1 ; TY +1 px
					tBuffer[tIdx+3 * tw+3] += sR * nw; tBuffer[tIdx+3 * tw+4] += sG * nw; tBuffer[tIdx+3 * tw+5] += sB * nw;
				}
			}
		}

		//RGBA of target to result canvas
		for(sIdx=0, tIdx=0; pxIndex < tw*th; sIdx+=3, tIdx+=4, pxIndex++) {
			tByteBuffer[tIdx + 0] = Math.ceil(tBuffer[sIdx + 0]);
			tByteBuffer[tIdx + 1] = Math.ceil(tBuffer[sIdx + 1]);
			tByteBuffer[tIdx + 2] = Math.ceil(tBuffer[sIdx + 2]);
			tByteBuffer[tIdx + 3] = 255;
		} resultCTX.putImageData(resultIMG, 0, 0);

        if(object.canvasRotate) drawRotated(image, resultCV, resultCTX, scaleArr, imageUtility.photoDegree(object.imgExif[2]));

		tByteBuffer = resultIMG = tBuffer = sBuffer = null;
        if(typeof(CollectGarbage) == "function") CollectGarbage();

		return resultCV;
	}

	var imgObjPackage = function(idx, strData, file, imgSize, imgExif) {
        imgObj[idx] = [];
        imgObj[idx][0] = strData; imgObj[idx][1] = file.type; imgObj[idx][2] = file.name;
        imgObj[idx][3] = imgSize[idx].spec == 'SQR' ? imgSize[idx].W : 0 | imgReSize[0].W;
        imgObj[idx][4] = imgSize[idx].spec == 'SQR' ? imgSize[idx].H : 0 | imgReSize[0].H;
        imgObj[idx][5] = imgExif[0] || null; imgObj[idx][6] = imgExif[1] || null;
        imgObj[idx][7] = imgExif[2] || null;
    }

    var finishUpload = function(image, file, thumbnail, imgSize, imgExif, object) {
    	var html5 = new html5Upload();
    	if(object.canvasRotate) for(var i in imgObj) imgObj[i][7] = 1;
        if(thumbnail.thumbnail) {
            if(thumbnail.thumbnail.pick) {
                //Pick a thumbnail
                var imgBlobObj = imageUtility.dataURL2Blob(imgObj[thumbnail.thumbnail.pick][0], 'image/jpeg');
                var thumbBlobURL = window.URL.createObjectURL(imgBlobObj);
            } else if(thumbnail.thumbnail.width || thumbnail.thumbnail.height) {
                //Refactor a thumbnail
                var thumbBlobURL = imageUtility.thumbnail(image, thumbnail.thumbnail);
            }

            var thumbImage = new Image(); thumbImage.src = thumbBlobURL;
            var thumbDegPick = thumbnail.thumbnail.pick || 0;
            thumbImage.deg = imageUtility.photoDegree(imgObj[thumbDegPick][7]) + 'deg';

            thumbnail.thumbEvent(thumbImage); thumbImage = null;
            if(typeof(CollectGarbage) == "function") CollectGarbage();
        }

        html5.setParas({'counter': uploadCounter});
        html5.ajaxTxing(imgObj, file);

        photoSizeArr.shift(); if(!pCnt) photoSizeArr = [];
        image = file = thumbnail = imgSize = imgExif = imgObj = null;
        if(typeof(CollectGarbage) == "function") CollectGarbage();
    }

	return {
		imgResizeMAX : function(MAX_WIDTH, MAX_HEIGHT, width, height) {
			return resizeMAX(MAX_WIDTH, MAX_HEIGHT, width, height);
		},

		imgResizeMIN : function(MIN_WIDTH, MIN_HEIGHT, width, height) {
			return resizeMIN(MIN_WIDTH, MIN_HEIGHT, width, height);
		},

		dataURL2Blob : function(dataURL, dataTYPE) {
			var binary = atob(dataURL.split(',')[1]), array = [];
			for( var i=0; i<binary.length; i++ ) array.push(binary.charCodeAt(i));
			return new Blob([new Uint8Array(array)], {type: dataTYPE || 'image/jpeg'});
		},

		cutSquare : function(canvas, width, height) {
			width = 0 | width; height = 0 | height;
			length = width < height ? width : height; length -= 2;
			cutPosX = 0 | (( width - length ) / 2); cutPosY = 0 | (( height - length ) / 2);
			var newCanvas = document.createElement("canvas"); newCanvas.width = length; newCanvas.height = length;
			newCanvas.getContext("2d").drawImage(canvas, cutPosX, cutPosY, length, length, 0, 0, length, length);
			return newCanvas.toDataURL("image/jpeg");
		},

		canvas2JPEG : function(image, scale, mode, object) {
            var quality = scale[3] || object.quality || 'normal';
            if(quality == 'normal') var resultCanvas = normalQuality(image, scale, object);
            else var resultCanvas = fineQuality(image, scale, object);
            var strData = resultCanvas.toDataURL("image/jpeg");
            return mode == 'canvas' ? resultCanvas : strData;
		},

		thumbnail : function(image, object) {
			var thumWidth = object.width || 100, thumHeight = object.height || 100;
			var thuW = null, thuH = null;
			if( image.width < image.height ) {
				thuW = thumWidth;
				var sizeArr = imageUtility.imgResizeMAX(thuW, thuH, image.width, image.height);
			} else {
				thuH = thumHeight;
				var sizeArr = imageUtility.imgResizeMAX(thuW, thuH, image.width, image.height);
			}
			var thumbCV = imageUtility.canvas2JPEG(image, sizeArr, 'canvas', object);
			var thumb_dataUrl = imageUtility.cutSquare(thumbCV, sizeArr[1], sizeArr[2]);
			var imgBlobObj = imageUtility.dataURL2Blob(thumb_dataUrl, 'image/jpeg');
			return window.URL.createObjectURL(imgBlobObj);
		},

		photoDegree : function(orit){
            var deg = 0;
            switch(orit) {
                case 1: deg = 0; break; case 3: deg = 180; break;
                case 6: deg = 90; break; case 8: deg = -90; break;
                default: deg = 0; break;
            }
            return deg;
        },

		getSize : function(_FILE_) {
            var _A_ = [_FILE_], _B_ = 0; for(var _C_=0; _C_<_A_.length; _C_++) {
                switch(typeof _A_[_C_]) {
                    case "number": _B_ += 8; break;
                    case "boolean": _B_ += 4; break;
                    case "string": _B_ += 2*_A_[_C_].length; break;
                    case "object":
                        if(Object.prototype.toString.call(_A_[_C_]) != "[object Array]") for(var _D_ in _A_[_C_]) _B_ += 2*_D_.length;
                        for(var _D_ in _A_[_C_]) {
                            var _E_ = false; for(var _F_=0; _F_<_A_.length; _F_++) {
                                if(_A_[_F_] === _A_[_C_][_D_]) { _E_ = true; break; }
                            } if(!_E_) _A_.push(_A_[_C_][_D_]);
                        } break;
                    default : _B_ += 2; break;
                }
            } return _B_;
        },

        getDelay : function(){
            var delayTime = !!window.URL ? 400 : navigator.buildID ? 3200 : 5600;
            var delayIncrease = !!window.webkitURL ? 100 : navigator.buildID ? 800 : 2400;
            if((+eval(photoSizeArr.join('+'))/1000000)*10 > 500)
                delayTime += (0 | (+eval(photoSizeArr.join('+'))/1000000)*10 / 500) * delayIncrease;
            return delayTime;
        },

        imgAspectRatio : function(image, imgSize, imgQuality) {
            for(var i in imgSize) {
                if(imgSize[i].spec == 'SQR') {
                    var sqrW = null, sqrH = null;
                    if(image.width < image.height)
                        var sizeArr = imageUtility.imgResizeMAX(imgSize[i].W+2, sqrH, image.width, image.height);
                    else
                        var sizeArr = imageUtility.imgResizeMAX(sqrW, imgSize[i].H+2, image.width, image.height);
                } else {
                    if(imgSize[i].spec == 'MAX')
                        var sizeArr = imageUtility.imgResizeMAX(imgSize[i].W, imgSize[i].H, image.width, image.height);
                    else
                        var sizeArr = imageUtility.imgResizeMIN(imgSize[i].W, imgSize[i].H, image.width, image.height);
                }
                imgReSize[i] = {'S': sizeArr[0], 'W': sizeArr[1], 'H': sizeArr[2], 'Q': imgQuality[i] || 'normal'};
            } return sizeArr;
        },

        imageProcessor: function(image, file, thumbnail, imgSize, imgExif, object, sBuffer) {
            var html5 = new html5Upload(), idx = Object.keys(imgSize).length - imgReSize.length;
            if(imgReSize.length > +!!object.newImg) {
                if(imgReSize[0].Q == 'fine' && typeof window.Worker == "function") {
                    var cv = document.createElement("canvas"); cv.width = image.width; cv.height = image.height;
                        cv.getContext("2d").drawImage(image, 0, 0);
                    var sw = cv.width, sh = cv.height, tw = Math.floor(sw * imgReSize[0].S), th = Math.floor(sh * imgReSize[0].S),
                        sBuffer = sBuffer || cv.getContext("2d").getImageData(0, 0, sw, sh);
                    var resultCV = document.createElement("canvas"); resultCV.width = tw; resultCV.height = th;
                    var resultCTX = resultCV.getContext("2d"), resultIMG = resultCTX.getImageData(0, 0, tw, th), tByteBuffer = resultIMG.data;
                    var imageWorker = new Worker("js/imageWorker.js");
                    imageWorker.postMessage({'sBuffer': sBuffer, 'scale': imgReSize[0].S, 'width': image.width, 'height': image.height});
                    imageWorker.onmessage = function(e) {
                        if(typeof(tByteBuffer.set) == "function") tByteBuffer.set(e.data);
                        else for(var i in e.data) tByteBuffer[i] = e.data[i];
                        resultCTX.putImageData(resultIMG, 0, 0);
                        var scaleArr = [imgReSize[0].S, imgReSize[0].W, imgReSize[0].H];
                        if(object.canvasRotate) drawRotated(image, resultCV, resultCTX, scaleArr, imageUtility.photoDegree(object.imgExif[2]));
                        if(imgSize[idx].spec == 'SQR')
                            var strData = imageUtility.cutSquare(resultCV, imgReSize[0].W, imgReSize[0].H);
                        else
                            var strData = resultCV.toDataURL("image/jpeg");
                        imgObjPackage(idx, strData, file, imgSize, imgExif);
                        e.data = imageWorker = strData = resultIMG = null; if(typeof(CollectGarbage) == "function") CollectGarbage();
                        imgReSize.shift(); imageUtility.imageProcessor(image, file, thumbnail, imgSize, imgExif, object, sBuffer);
                    }
                    imageWorker.onerror = function(e) { console.error(e.message +' in '+ e.filename + ' Line: ' + e.lineno) }
                } else {
                    var resultCV = imageUtility.canvas2JPEG(image, [imgReSize[0].S, imgReSize[0].W, imgReSize[0].H, imgReSize[0].Q], 'canvas', object);
                    if(imgSize[idx].spec == 'SQR')
                        var strData = imageUtility.cutSquare(resultCV, imgReSize[0].W, imgReSize[0].H);
                    else
                        var strData = resultCV.toDataURL("image/jpeg");
                    imgObjPackage(idx, strData, file, imgSize, imgExif);
                    strData = resultCV = null; if(typeof(CollectGarbage) == "function") CollectGarbage();
                    imgReSize.shift(); imageUtility.imageProcessor(image, file, thumbnail, imgSize, imgExif, object);
                }
            } else {
                if(object.newImg) imgObjPackage(imgObj.length, object.newImg, file, imgSize, imgExif);
                html5.setParas({'counter': uploadCounter});
                finishUpload(image, file, thumbnail, imgSize, imgExif, object);
                html5 = sBuffer = imgObj = null; imgObj = []; pLock = true; if(typeof(CollectGarbage) == "function") CollectGarbage();
            }
        },

		readProcess : function(e, file, object, imgExif) {
			var html5 = new html5Upload();
            object = object || {}; imgExif = imgExif.length ? imgExif : [null, null, 1];
			if(!!~html5.paras('imageMime').indexOf(file.type)) {
                pQueue[pCnt] = {
                    'eDataURL': JSON.stringify(e.target.result),
                    'file': JSON.stringify({
                    	'type': file.type || 'image/jpeg',
                    	'name': file.name || 'anonymous',
                    	'size': file.size || 0
                    }),
                    'imgExif': JSON.stringify(imgExif)
                }; pCnt++;

                photoSizeArr.push(imageUtility.getSize(JSON.stringify(e.target.result)));

                var pId = setInterval(processInterval, imageUtility.getDelay());
                function processInterval() {
                    if(pLock) {
                        var pObject = pQueue.shift(); pCnt--; clearInterval(pId); pLock = false; uploadCounter++;
                        var imgSize = object.imgSize || {
                            '0': {'spec': 'SQR', 'W': 55, 'H': 55},
                            '1': {'spec': 'SQR', 'W': 200, 'H': 200},
                            '2': {'spec': 'MAX', 'W': 400, 'H': null},
                            '3': {'spec': 'MAX', 'W': 700, 'H': 700},
                            '4': {'spec': 'MAX', 'W': 1400, 'H': 1400}
                        };
                        eDataURL = JSON.parse(pObject['eDataURL']);
                        file = JSON.parse(pObject['file']);
                        object.quality = object.quality || 'normal';
                        var imgQualityArr = object.imgQuality || []; object.imgQuality = [];
                        for(var i=0; i<Object.keys(imgSize).length; i++)
                        	object.imgQuality[i] = imgQualityArr[i] || object.quality;

                        object.canvasRotate = object.canvasRotate || false;
                        imgExif = JSON.parse(pObject['imgExif']);
                        object.imgExif = imgExif;
                        var thumbnail = {'thumbnail': object.thumbnail, 'thumbEvent': object.thumbEvent};
                        var image = new Image(); image.src = eDataURL;
                        image.onload = function() {
                            // make thumbnail
                            if(thumbnail.thumbnail) {
                                if(thumbnail.thumbnail.preview) {
                                    var pick = thumbnail.thumbnail.pick || 0,
                                        quality = thumbnail.thumbnail.quality || 'normal';
                                    var thumbBlobURL = imageUtility.thumbnail(image, {
                                        'width': imgReSize[pick].W,
                                        'height': imgReSize[pick].H,
                                        'quality': quality
                                    });
                                    thumbnail.thumbEvent({
                                        'src': thumbBlobURL,
                                        'deg': imageUtility.photoDegree(imgExif[2])+'deg' || '0deg'
                                    });
                                }
                            }

                            // make image resize
                            if(image.width * image.height <= 1000000) {
                                imageUtility.imgAspectRatio(image, imgSize, object.imgQuality);
                                object.newImg = null;
                                imageUtility.imageProcessor(image, file, thumbnail, imgSize, imgExif, object);
                                html5 = e = file = image = eDataURL = pObject = null;
                                if(typeof(CollectGarbage) == "function") CollectGarbage();
                            } else {
                                var sizeArr = imageUtility.imgAspectRatio(image, imgSize, object.imgQuality),
                                    newImg = imageUtility.canvas2JPEG(image, sizeArr, 'dataurl', object),
                                    newImgUrl = window.URL.createObjectURL(imageUtility.dataURL2Blob(newImg));
                                var newImage = new Image(); newImage.src = newImgUrl;
                                newImage.onload = function() {
                                    imageUtility.imgAspectRatio(newImage, imgSize, object.imgQuality);
                                    object.newImg = newImg;
                                    imageUtility.imageProcessor(newImage, file, thumbnail, imgSize, imgExif, object);
                                    html5 = e = file = image = eDataURL = pObject = null;
                                    if(typeof(CollectGarbage) == "function") CollectGarbage();
                                }
                            }
                        }
                    }
                }
            } else console.error('occur imageMime Error');
		}
	};
})();
