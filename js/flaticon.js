//canvas+context where preview is generated
var previewCanvas  = document.getElementById("canvas");
var previewContext = canvas.getContext("2d");

//button for downloading icon
var downloadButton = document.getElementById("download");

//controls
var colorPicker   = document.getElementById('colorPicker');
var shapePicker   = document.getElementById('shapePicker');
var paddingPicker = document.getElementById("paddingPicker");
var anglePicker   = document.getElementById('anglePicker');
var opacityPicker = document.getElementById("opacityPicker");
var lengthPicker  = document.getElementById("lengthPicker");

var defaultIconColor = "hsl(168, 76%, 42%)"; //default color for background
var downloadDisabled = true; //has an image been uploaded yet?
var shadowOpacity    = 0.3; //opacity for shadow
var shadowLength     = 1; //length of shadow
var shadowAngle      = 45; //opacity for shadow
var padding          = 0; //percent padding for icon (0 - 1.0)

//keep memory of canvases
var lastCroppedIconCanvas; //most recently uploaded icon after cropping
var lastIconBackground; //most recently generated circle canvas
var lastPaddedIconCanvas; //most recently uploaded icon after padding
var lastUnmergedIconCanvas; //most recently uploaded icon after shadow
var lastMergedIconCanvas; //most recently uploaded icon after merging
var lastScaleFactor; //most recently used scale factor

//setup preview canvas placeholder
function setupPlaceholder() {
  previewContext.fillStyle = "rgb(200, 200, 200)";
  previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewContext.fillStyle = "rgb(150, 150, 150)";
  previewContext.font = "16px Helvetica";
  previewContext.fillText("PREVIEW", 120, 150);
}

function setupIconLibrarySelectionListener() {
  $('li[class^=ion]').click(function(e) {
    var originalElement = e.target;
    var imageName = originalElement.classList[0].slice(4);
    $('#IconLibraryModal').modal('hide');
    generateFlatIconFromImage("/img/ionicons/" + imageName + ".png");
  });
}

//load image at a data URL
function generateFlatIconFromImage(dataURL) {
    loadToCanvas(dataURL, function (image) {
        lastCroppedIconCanvas = cropVisibleImageToNewCanvas(image);
        var widthWithPadding  = lastCroppedIconCanvas.width  * padding + lastCroppedIconCanvas.width;
        var heightWithPadding = lastCroppedIconCanvas.height * padding + lastCroppedIconCanvas.height;
        lastIconBackground    = createIconBackground(diameterForDimensions(widthWithPadding, heightWithPadding));
        lastPaddedIconCanvas  = centerCanvas(lastCroppedIconCanvas, lastIconBackground.width, lastIconBackground.height);
        lastUnmergedIconCanvas = drawShadow(lastPaddedIconCanvas, shadowAngle);
        lastMergedIconCanvas   = mergeIconWithBackground(lastUnmergedIconCanvas, lastIconBackground);
      
        //update the icon preview
        updatePreview();

        //reenable download option
        if (downloadDisabled) {
            downloadButton.classList.remove("disabled");
            downloadDisabled = false;
        }
    });
}

function updateCurrentPadding() {
    padding = paddingPicker.value;
    if (lastCroppedIconCanvas != null) {
        var widthWithPadding = lastCroppedIconCanvas.width * padding + lastCroppedIconCanvas.width;
        var heightWithPadding = lastCroppedIconCanvas.height * padding + lastCroppedIconCanvas.height;
        lastIconBackground = createIconBackground(diameterForDimensions(widthWithPadding, heightWithPadding));
        lastPaddedIconCanvas = centerCanvas(lastCroppedIconCanvas, lastIconBackground.width, lastIconBackground.height);
        lastUnmergedIconCanvas = drawShadow(lastPaddedIconCanvas, anglePicker.value);
        lastMergedIconCanvas = mergeIconWithBackground(lastUnmergedIconCanvas, lastIconBackground);
        updatePreview();
    }
}

function updateCurrentShadow() {
    shadowAngle   = anglePicker.value;
    shadowOpacity = opacityPicker.value;
    shadowLength  = lengthPicker.value;

    if (lastPaddedIconCanvas != null) {
        lastUnmergedIconCanvas = drawShadow(lastPaddedIconCanvas, shadowAngle);
        lastMergedIconCanvas = mergeIconWithBackground(lastUnmergedIconCanvas, lastIconBackground);
        updatePreview();
    }
}

function updateCurrentBackground() {
    if (lastUnmergedIconCanvas != null) {
        lastIconBackground = createIconBackground(lastUnmergedIconCanvas.width);
        lastMergedIconCanvas = mergeIconWithBackground(lastUnmergedIconCanvas, lastIconBackground);
        updatePreview();
    }
}

function updatePreview() {
    //reset canvas
    previewContext.scale(1 / lastScaleFactor, 1 / lastScaleFactor);
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    //fit icon to canvas and draw 
    lastScaleFactor = previewCanvas.width / lastMergedIconCanvas.width;
    previewContext.scale(lastScaleFactor, lastScaleFactor);

    previewContext.drawImage(lastMergedIconCanvas, 0, 0);
}

function downloadIcon(link) {
    if (!downloadDisabled) {
        //set link properties
        link.href = lastMergedIconCanvas.toDataURL();
        link.download = "icon.png";
    }
}

//loads image selected onto a canvas and runs callback once complete
function loadToCanvas(dataURL, callback) {
    var imageObj = new Image();

    // load image from data url
    imageObj.onload = function () {
        callback(imageObj);
    };

    imageObj.src = dataURL;
}

//crop icon to visible in case there's blank space
function cropVisibleImageToNewCanvas(imageObj) {
    //get canvas data
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = imageObj.width;
    canvas.height = imageObj.height;

    //draw image to canvas
    context.drawImage(imageObj, 0, 0);

    //get image data
    var imageWidth = imageObj.width;
    var imageHeight = imageObj.height;
    var imageData = canvas.getContext('2d').getImageData(0, 0, imageWidth, imageHeight);
    var data = imageData.data;

    var cropStartX = imageWidth;
    var cropStartY = imageHeight;
    var cropEndX = 0;
    var cropEndY = 0;

    for (var y = 0; y < imageHeight; y++) {
        // loop through each column
        for (var x = 0; x < imageWidth; x++) {
            var alpha = data[((imageWidth * y) + x) * 4 + 3];

            //if this is an object pixel
            if (alpha > 0) {
                //update bounds
                if (x < cropStartX) {
                    cropStartX = x;
                }
                if (x > cropEndX) {
                    cropEndX = x;
                }
                if (y < cropStartY) {
                    cropStartY = y;
                }
                if (y > cropEndY) {
                    cropEndY = y;
                }
            }
        }
    }

    var newWidth = cropEndX - cropStartX + 1;
    var newHeight = cropEndY - cropStartY + 1;

    var cropCanvas = document.createElement('canvas');
    cropCanvas.width = newWidth;
    cropCanvas.height = newHeight;

    cropCanvas.getContext('2d').drawImage(imageObj, cropStartX, cropStartY, newWidth, newHeight, 0, 0, newWidth, newHeight);

    return cropCanvas;
}

//create background for icon
function createIconBackground(size) {
    //create new canvas
    var iconBackgroundCanvas = document.createElement('canvas');
    iconBackgroundCanvas.width = size;
    iconBackgroundCanvas.height = size;
    var context = iconBackgroundCanvas.getContext('2d');

    //set icon background color
    context.fillStyle = defaultIconColor;

    //draw circle or square icon depending on setting
    if (shapePicker.value == 'circle') {
        context.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        context.fill();
    } else {
        context.fillRect(0, 0, size, size);
    }

    return iconBackgroundCanvas;
}

//re-center canvas in larger dimension
function centerCanvas(canvas, width, height) {
    //save backup of canvas for later
    var paddedCanvas = document.createElement('canvas');
    paddedCanvas.width = width;
    paddedCanvas.height = height;

    //calculate offsets
    var paddingX = (width - canvas.width) * 0.5;
    var paddingY = (height - canvas.height) * 0.5;

    //draw image in new canvas at offset
    paddedCanvas.getContext('2d').drawImage(canvas, paddingX, paddingY);

    return paddedCanvas;
}

//draws shadow on an icon canvas
function drawShadow(canvas, degree) {
    //get canvas data and info on where to draw shadow
    var imageSize = canvas.width;
    var context   = canvas.getContext('2d');
    var degreesToRadians = 0.0174532925;
    var slope = Math.tan(degree * degreesToRadians);

    //create new canvas to avoid modifying old
    var iconWithShadow = document.createElement('canvas');
    var iconWithShadowContext = iconWithShadow.getContext('2d');
    iconWithShadow.width  = imageSize;
    iconWithShadow.height = imageSize;
    iconWithShadowContext.drawImage(canvas, 0, 0);

    //translate image in direction of slope
    iconWithShadowContext.imageSmoothingEnabled = true;
    for (var i = 1; i < (imageSize / 2) * shadowLength; i++) {
        iconWithShadowContext.drawImage(canvas, i, slope * i);
        var j = (i - 1) * slope;
        if (slope * i > 1) { //if we've skipped around
            while (j < i * slope && j < imageSize) {
                iconWithShadowContext.drawImage(canvas, i, j);
                j++;
            }
        }
    }

    //get new canvas image data
    var imageData = iconWithShadowContext.getImageData(0, 0, imageSize, imageSize);
    var data = imageData.data;

    //get old canvas image data
    var oldImageData = context.getImageData(0, 0, imageSize, imageSize);
    var oldData = oldImageData.data;

    //set image trail to shadow color
    for (var i = 0, n = data.length; i < n; i += 4) {
        data[i] = oldData[i];
        data[i + 1] = oldData[i + 1];
        data[i + 2] = oldData[i + 2];
      
        var alpha = data[i + 3] / 255;
        var oldAlpha = oldData[i + 3] / 255;
        //if solid on o.g. icon and shadow, leave it
        if (alpha == 1 && oldAlpha == 1) {
            data[i + 3] = oldData[i + 3];
        } 
        //else, transparentize it
        else {
            data[i + 3] = oldData[i + 3] + (shadowOpacity * data[i + 3]);
        }
    }
    iconWithShadowContext.putImageData(imageData, 0, 0);

    return iconWithShadow;
}

//merges icon canvas with circle canvas
function mergeIconWithBackground(iconCanvas, backgroundCanvas) {
    var imageSize = iconCanvas.width;

    //get icon data
    var iconContext = iconCanvas.getContext('2d');
    var iconImageData = iconContext.getImageData(0, 0, imageSize, imageSize);
    var iconData = iconImageData.data;

    //get background data
    var backgroundContext = backgroundCanvas.getContext('2d');
    var backgroundImageData = backgroundContext.getImageData(0, 0, imageSize, imageSize);
    var backgroundData = backgroundImageData.data;

    // iterate over all pixels
    for (var i = 0, n = backgroundData.length; i < n; i += 4) {
        //get alpha channels
        var iconAlpha = iconData[i + 3] / 255;
        var backgroundAlpha = backgroundData[i + 3] / 255;

        //if color visible on both icon and background
        if (backgroundAlpha > 0 && iconAlpha > 0) {
            //use icon colors if solid
            if (iconAlpha == 1 && backgroundAlpha == 1) {
                backgroundData[i] = iconData[i];
                backgroundData[i + 1] = iconData[i + 1];
                backgroundData[i + 2] = iconData[i + 2];
                backgroundData[i + 3] = iconData[i + 3];
            } 
            //else merge if icon semi-transparent	
            else { 					
                backgroundData[i] = (iconData[i] + (1 - iconAlpha) * backgroundData[i]);
                backgroundData[i + 1] = (iconData[i + 1] + (1 - iconAlpha) * backgroundData[i + 1]);
                backgroundData[i + 2] = (iconData[i + 2] + (1 - iconAlpha) * backgroundData[i + 2]);
                backgroundData[i + 3] = (iconData[i + 3] + (1 - iconAlpha) * backgroundData[i + 3]);
            }
        }
    }

    //put icon+background data on new canvas
    var final = document.createElement('canvas');
    final.width = imageSize;
    final.height = imageSize;
    final.getContext('2d').putImageData(backgroundImageData, 0, 0);

    return final;
}

//get diameter of circle than can enclose square icon
function diameterForDimensions(width, height) {
    return Math.sqrt(width * width + height * height);
}

/* FILE API */
function handleFileSelect(evt) {
    handleDragExit();
    evt.stopPropagation();
    evt.preventDefault();

    //gets files from either upload button or drag & drop
    var files = evt.dataTransfer ? evt.dataTransfer.files : evt.target.files; // FileList object

    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {

        // Only process image files.
        if (!f.type.match('image.*')) {
            continue;
        }

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            return function (e) {
                // Render thumbnail.
                generateFlatIconFromImage(e.target.result);
            };
        })(f);

        // Read in the image file as a data URL.
        reader.readAsDataURL(f);
    }
}

function handleDragOver(evt) {
    handleDragEnter();
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function handleDragEnter() {
    document.getElementById('drop_zone').classList.add('dropping');
}
function handleDragExit() {
    document.getElementById('drop_zone').classList.remove('dropping');
}

//manually trigger file upload button
function triggerFileUpload() {
    document.getElementById('files').click();
}

function setupFileListener() {
  //setup drop zone for icons
  var dropZone = document.getElementById('drop_zone');
  dropZone.addEventListener('dragexit', handleDragExit, false);
  dropZone.addEventListener('dragleave', handleDragExit, false);
  dropZone.addEventListener('drop', handleFileSelect, false);
  
  dropZone.addEventListener('dragenter', handleDragEnter, false);
  dropZone.addEventListener('dragover', handleDragOver, false);
  document.getElementById('files').addEventListener('change', handleFileSelect, false);
}

/* END FILE API */

/* COLOR PICKER */
$(colorPicker).colpick({
    color: defaultIconColor,
    layout: 'hex',
    submit: 0,
    colorScheme: 'dark',
    onChange: function (hsb, hex, rgb, el, bySetColor) {
        $(el).css('border-color', '#' + hex);
        defaultIconColor = "#" + hex;
        updateCurrentBackground();

        // Fill the text box just if the color was set using the picker, and not the colpickSetColor function.
        if (!bySetColor) $(el).val(hex);
    }
}).keyup(function () {
    $(this).colpickSetColor(this.value);
});
/* END COLOR PICKER */

/* INIT OPACITY SLIDER */
$(opacityPicker).rangeslider({
    polyfill: false,

    // Callback function
    onSlide: function (position, value) {
        updateCurrentShadow();
    }
});
/* END INIT SLIDER */

/* INIT LENGTH SLIDER */
$(lengthPicker).rangeslider({
    polyfill: false,

    // Callback function
    onSlide: function (position, value) {
        updateCurrentShadow();
    }
});
/* END INIT SLIDER */

/* INIT ANGLE SLIDER */
$(anglePicker).rangeslider({
    polyfill: false,

    // Callback function
    onSlide: function (position, value) {
        updateCurrentShadow();
    }
});
/* END INIT SLIDER */

/* INIT PADDING SLIDER */
$(paddingPicker).rangeslider({
    polyfill: false,

    // Callback function
    onSlide: function (position, value) {
        updateCurrentPadding()
    }
});
/* END INIT SLIDER */

/* INIT SHAPE PICKER */
shapePicker.onchange = function () {
    updateCurrentBackground();
};
/* END INIT SWITCH */

/* Setup 'Preview' text as placeholder in canvas*/
setupPlaceholder();
setupFileListener();
setupIconLibrarySelectionListener();