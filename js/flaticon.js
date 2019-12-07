class Util {
    // Loads image selected onto a canvas and runs callback once complete
    static loadToCanvas(dataURL) {
        return new Promise((resolve, reject) => {
            const imageObj = new Image();

            // load image from data url
            imageObj.onload = function () {
                resolve(imageObj);
            };

            imageObj.onerror = function (err) {
                reject(err);
            }

            imageObj.src = dataURL;
        });
    }

    //get diameter of circle than can enclose square icon
    static diameterForDimensions(width, height) {
        return Math.sqrt(width * width + height * height);
    }

    //crop icon to visible in case there's blank space
    static cropVisibleImageToNewCanvas(imageObj) {
        //get canvas data
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = imageObj.width;
        canvas.height = imageObj.height;

        //draw image to canvas
        context.drawImage(imageObj, 0, 0);

        //get image data
        const imageWidth = imageObj.width;
        const imageHeight = imageObj.height;
        const imageData = canvas.getContext('2d').getImageData(0, 0, imageWidth, imageHeight);
        const data = imageData.data;

        let cropStartX = imageWidth;
        let cropStartY = imageHeight;
        let cropEndX = 0;
        let cropEndY = 0;

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

        const newWidth = cropEndX - cropStartX + 1;
        const newHeight = cropEndY - cropStartY + 1;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = newWidth;
        cropCanvas.height = newHeight;

        cropCanvas.getContext('2d').drawImage(imageObj, cropStartX, cropStartY, newWidth, newHeight, 0, 0, newWidth, newHeight);

        return cropCanvas;
    }

    //re-center canvas in larger dimension
    static centerCanvas(canvas, width, height) {
        //save backup of canvas for later
        const paddedCanvas = document.createElement('canvas');
        paddedCanvas.width = width;
        paddedCanvas.height = height;

        //calculate offsets
        const paddingX = (width - canvas.width) * 0.5;
        const paddingY = (height - canvas.height) * 0.5;

        //draw image in new canvas at offset
        paddedCanvas.getContext('2d').drawImage(canvas, paddingX, paddingY);

        return paddedCanvas;
    }

    //create background for icon
    static createIconBackground(background, shape, size) {
        //create new canvas
        const iconBackgroundCanvas = document.createElement('canvas');
        const iconBackgroundContext = iconBackgroundCanvas.getContext('2d');

        iconBackgroundCanvas.width = size;
        iconBackgroundCanvas.height = size;

        //set icon background color
        iconBackgroundContext.fillStyle = background;

        //draw circle or square icon depending on setting
        if (shape === 'circle') {
            iconBackgroundContext.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
            iconBackgroundContext.fill();
        } else {
            iconBackgroundContext.fillRect(0, 0, size, size);
        }

        return iconBackgroundCanvas;
    }

    //draws shadow on an icon canvas
    static drawShadow(canvas, shadowAngle, shadowLength, shadowOpacity) {
        //get canvas data
        const imageSize = canvas.width;
        const context = canvas.getContext('2d');

        //create new canvas to avoid modifying old
        const iconWithShadow = document.createElement('canvas');
        const iconWithShadowContext = iconWithShadow.getContext('2d');
        iconWithShadow.width = imageSize;
        iconWithShadow.height = imageSize;

        //calculate slope of shadow
        const degreesToRadians = 0.0174532925;
        const slope = Math.tan(shadowAngle * degreesToRadians);

        //draw shadow at slope
        iconWithShadowContext.imageSmoothingEnabled = true;
        for (var i = 0; i < (imageSize / 2) * shadowLength; i++) {
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
        const imageData = iconWithShadowContext.getImageData(0, 0, imageSize, imageSize);
        const data = imageData.data;

        //get old canvas image data
        const oldImageData = context.getImageData(0, 0, imageSize, imageSize);
        const oldData = oldImageData.data;

        //set image trail to shadow color
        for (var i = 0, n = data.length; i < n; i += 4) {
            data[i] = oldData[i];
            data[i + 1] = oldData[i + 1];
            data[i + 2] = oldData[i + 2];

            //transparentize to shadow opacity
            data[i + 3] = oldData[i + 3] + (shadowOpacity * data[i + 3]);
        }
        iconWithShadowContext.putImageData(imageData, 0, 0);

        //redraw o.g. image atop.
        iconWithShadowContext.drawImage(canvas, 0, 0);

        return iconWithShadow;
    }

    //merges icon canvas with circle canvas
    static mergeIconWithBackground(iconCanvas, backgroundCanvas) {
        const imageSize = iconCanvas.width;

        //get icon data
        const iconContext = iconCanvas.getContext('2d');
        const iconImageData = iconContext.getImageData(0, 0, imageSize, imageSize);
        const iconData = iconImageData.data;

        //get background data
        const backgroundContext = backgroundCanvas.getContext('2d');
        const backgroundImageData = backgroundContext.getImageData(0, 0, imageSize, imageSize);
        const backgroundData = backgroundImageData.data;

        // iterate over all pixels
        for (var i = 0, n = backgroundData.length; i < n; i += 4) {
            //get alpha channels
            const iconAlpha = iconData[i + 3] / 255;
            const backgroundAlpha = backgroundData[i + 3] / 255;

            //if color visible on both icon and background
            if (backgroundAlpha > 0 && iconAlpha > 0) {
                //use icon colors if solid
                if (iconAlpha === 1 && backgroundAlpha === 1) {
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
        const final = document.createElement('canvas');
        final.width = imageSize;
        final.height = imageSize;
        final.getContext('2d').putImageData(backgroundImageData, 0, 0);

        return final;
    }
}

class ConfigurationControls {
    // Controls
    colorPicker = null;
    shapePicker = null;
    paddingPicker = null;
    anglePicker = null;
    opacityPicker = null;
    lengthPicker = null;

    // Settings
    iconBackground = "hsl(168, 76%, 42%)"; // default color for background
    iconShape = "circle"; // square or circle
    iconPadding = 0;      // percent padding for icon (0 - 1.0)
    shadowOpacity = 0.3;  // opacity for shadow
    shadowLength = 1;     // length of shadow
    shadowAngle = 45;     // opacity for shadow

    onBackgroundChange = null;
    onShadowChange = null;
    onPaddingChange = null;

    constructor({
        colorPickerId,
        shapePickerId,
        paddingPickerId,
        anglePickerId,
        opacityPickerId,
        lengthPickerId,
    }) {
        this.colorPicker    = document.getElementById(colorPickerId);
        this.shapePicker    = document.getElementById(shapePickerId);
        this.paddingPicker  = document.getElementById(paddingPickerId);
        this.anglePicker    = document.getElementById(anglePickerId);
        this.opacityPicker  = document.getElementById(opacityPickerId);
        this.lengthPicker   = document.getElementById(lengthPickerId);

        this.setup();
    }

    setup = () => {
        /* COLOR PICKER */
        $(this.colorPicker).colpick({
            color: this.iconBackground,
            layout: 'hex',
            submit: 0,
            colorScheme: 'dark',
            onChange: (hsb, hex, rgb, el, bySetColor) => {
                $(el).css('border-color', '#' + hex);
                this.iconBackground = '#' + hex;
                if (this.onBackgroundChange) {
                    this.onBackgroundChange();
                }

                // Fill the text box just if the color was set using the picker, and not the colpickSetColor function.
                if (!bySetColor) $(el).val(hex);
            }
        }).keyup(function () {
            $(this).colpickSetColor(this.value);
        });
        /* END COLOR PICKER */

        /* INIT SHAPE PICKER */
        this.shapePicker.addEventListener("change", (event) => {
            this.iconShape = event.target.value;

            console.log(this.shape);
            if (this.onBackgroundChange) {
                console.log("onBackgroundChange", this.onBackgroundChange);
                this.onBackgroundChange();
            }
        });
        /* END INIT SWITCH */

        /* INIT OPACITY SLIDER */
        $(this.opacityPicker).rangeslider({
            polyfill: false,

            // Callback function
            onSlide: (position, value) => {
                this.shadowOpacity = value;

                if (this.onShadowChange) {
                    this.onShadowChange();
                }
            }
        });
        /* END INIT SLIDER */

        /* INIT LENGTH SLIDER */
        $(this.lengthPicker).rangeslider({
            polyfill: false,

            // Callback function
            onSlide: (position, value) => {
                this.shadowLength = value;

                if (this.onShadowChange) {
                    this.onShadowChange();
                }
            }
        });
        /* END INIT SLIDER */

        /* INIT ANGLE SLIDER */
        $(this.anglePicker).rangeslider({
            polyfill: false,

            // Callback function
            onSlide: (position, value) => {
                this.shadowAngle = value;

                if (this.onShadowChange) {
                    this.onShadowChange();
                }
            }
        });
        /* END INIT SLIDER */

        /* INIT PADDING SLIDER */
        $(this.paddingPicker).rangeslider({
            polyfill: false,

            // Callback function
            onSlide: (position, value) => {
                this.iconPadding = value;

                if (this.onPaddingChange) {
                    this.onPaddingChange();
                }
            }
        });
        /* END INIT SLIDER */
    }
}

class PreviewCanvas {
    canvasElement = null;
    canvasContext = null;

    constructor({ canvasId }) {
        // Canvas + context where preview is generated.
        this.canvasElement = document.getElementById(canvasId);
        this.canvasContext = this.canvasElement.getContext("2d");
        this.setup();
    }

    setup = () => {
        this.canvasContext.fillStyle = "rgb(200, 200, 200)";
        this.canvasContext.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.canvasContext.fillStyle = "rgb(150, 150, 150)";
        this.canvasContext.font = "16px Helvetica";
        this.canvasContext.fillText("PREVIEW", 120, 150);
    }
}

class UploadListener {
    dropZone = null;
    uploadButton = null;
    fileElement = null;
    counter = 0;

    onLoad = null;

    constructor({ dropZoneId, uploadButtonId, fileId, onLoad }) {
        this.dropZone = document.getElementById(dropZoneId);
        this.dropZone.addEventListener("dragover", this.cancelEvent, false);
        this.dropZone.addEventListener("dragenter", this.handleDragEnter, false);
        this.dropZone.addEventListener("dragleave", this.handleDragExit, false);
        this.dropZone.addEventListener("drop", this.handleFileSelect, false);

        // When a file is uploaded, handle it
        this.fileElement = document.getElementById(fileId);
        this.fileElement.addEventListener("change", this.handleFileSelect, false);

        // When the upload button is clicked, handle it.
        this.uploadButton = document.getElementById(uploadButtonId);
        this.uploadButton.addEventListener("click", () => {
            this.fileElement.click();
        });

        this.onLoad = onLoad;
    }

    handleFileSelect = (event) => {
        this.handleDragExit(event);
        event.stopPropagation();
        event.preventDefault();

        // Gets files from either upload button or drag & drop
        const files = event.dataTransfer
            ? event.dataTransfer.files
            : event.target.files; // FileList object

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
                    const result = e.target.result;
                    this.onLoad(result);
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsDataURL(f);
        }
    }

    handleDragEnter = (event) => {
        this.cancelEvent(event);
        this.counter++;

        this.dropZone.classList.add('dropping');
    }

    handleDragExit = (event) => {
        this.cancelEvent(event);
        this.counter--;

        if (counter === 0) {
            this.dropZone.classList.remove('dropping');
        }
    }

    cancelEvent = (event) => {
        event.preventDefault();
    }
}

class IconLibrarySelectionListener {
    selector = null;

    onLoad = null;

    constructor({ selectorId, onLoad }) {
        this.selector = document.getElementById(selectorId);
        this.onLoad = onLoad;

        this.setup();
    }

    setup = () => {
        $(this.selector).children().click((event) => this.onSelectionChange(event));
    }

    onSelectionChange = (event) => {
        const originalElement = event.target;
        const imageName = originalElement.classList[0].slice(4);
        $('#IconLibraryModal').modal('hide');

        this.onLoad('/img/ionicons/512/' + imageName + '.png');
    }
}

class DownloadButtonController {
    downloadButton = null;

    onDownload = null;

    constructor({ downloadButtonId }) {
        this.downloadButton = document.getElementById(downloadButtonId);
        this.downloadButton.addEventListener("click", this.downloadClicked)
    }

    enableDownloadButton = () => {
        if (!this.downloadButton.disabled) {
            return;
        }

        //reenable download option
        this.downloadButton.disabled = false;
    }

    downloadClicked = () => {
        this.onDownload();
    }
}

class AppController {
    configurationControls = null;
    previewCanvas = null;
    uploadListener = null;
    iconLibrarySelectionListener = null;
    downloadButtonController = null;

    lastCroppedIconCanvas = null;  // Foreground after cropping.
    lastPaddedIconCanvas = null;   // Foreground after padding.
    lastUnmergedIconCanvas = null; // Foreground after shadow.
    lastIconBackground = null;     // Background canvas.
    lastMergedIconCanvas = null;   // Foreground + background.

    constructor({
        configurationControls,
        previewCanvas,
        uploadListener,
        iconLibrarySelectionListener,
        downloadButtonController,
    }) {
        this.previewCanvas = previewCanvas;

        // Icon edit control change listeners.
        this.configurationControls = configurationControls;
        this.configurationControls.onBackgroundChange = this.updateCurrentBackground;
        this.configurationControls.onShadowChange = this.updateCurrentShadow;
        this.configurationControls.onPaddingChange = this.updateCurrentPadding;

        // File upload listener.
        this.uploadListener = uploadListener;
        this.uploadListener.onLoad = this.generateFlatIconFromImage;

        // Library icon selection listener.
        this.iconLibrarySelectionListener = iconLibrarySelectionListener;
        this.iconLibrarySelectionListener.onLoad = this.generateFlatIconFromImage;

        // Download button controller.
        this.downloadButtonController = downloadButtonController;
        this.downloadButtonController.onDownload = this.downloadIcon;
    }

    updateCurrentPadding = () => {
        if (this.lastCroppedIconCanvas !== null) {
            const iconPadding = this.configurationControls.iconPadding;
            const iconBackground = this.configurationControls.iconBackground;
            const iconShape = this.configurationControls.iconShape;
            const shadowAngle = this.configurationControls.shadowAngle;
            const shadowLength = this.configurationControls.shadowLength;
            const shadowOpacity = this.configurationControls.shadowOpacity;

            const widthWithPadding = this.lastCroppedIconCanvas.width * iconPadding + this.lastCroppedIconCanvas.width;
            const heightWithPadding = this.lastCroppedIconCanvas.height * iconPadding + this.lastCroppedIconCanvas.height;
            const iconDiameter = Util.diameterForDimensions(widthWithPadding, heightWithPadding);
            this.lastIconBackground = Util.createIconBackground(iconBackground, iconShape, iconDiameter);
            this.lastPaddedIconCanvas = Util.centerCanvas(this.lastCroppedIconCanvas, iconDiameter, iconDiameter);
            this.lastUnmergedIconCanvas = Util.drawShadow(this.lastPaddedIconCanvas, shadowAngle, shadowLength, shadowOpacity);
            this.lastMergedIconCanvas = Util.mergeIconWithBackground(this.lastUnmergedIconCanvas, this.lastIconBackground);

            // Update the icon preview.
            this.updatePreview();
        }
    }

    updateCurrentShadow = () => {
        if (this.lastPaddedIconCanvas !== null) {
            const shadowAngle = this.configurationControls.shadowAngle;
            const shadowLength = this.configurationControls.shadowLength;
            const shadowOpacity = this.configurationControls.shadowOpacity;
            this.lastUnmergedIconCanvas = Util.drawShadow(this.lastPaddedIconCanvas, shadowAngle, shadowLength, shadowOpacity);
            this.lastMergedIconCanvas = Util.mergeIconWithBackground(this.lastUnmergedIconCanvas, this.lastIconBackground);

            //update the icon preview
            this.updatePreview();
        }
    }

    updateCurrentBackground = () => {
        console.log("test");
        if (this.lastUnmergedIconCanvas !== null) {
            console.log("test2");
            const iconBackground = this.configurationControls.iconBackground;
            const iconShape = this.configurationControls.iconShape;
            this.lastIconBackground = Util.createIconBackground(iconBackground, iconShape, this.lastIconBackground.width);
            this.lastMergedIconCanvas = Util.mergeIconWithBackground(this.lastUnmergedIconCanvas, this.lastIconBackground);

            //update the icon preview
            this.updatePreview();
        }
    }

    updatePreview = () => {
        // Reset canvas scale & contents
        this.previewCanvas.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
        this.previewCanvas.canvasContext.clearRect(
            0,
            0,
            this.previewCanvas.canvasElement.width,
            this.previewCanvas.canvasElement.height,
        );

        //fit icon to canvas and draw
        const scaleFactor = this.previewCanvas.canvasElement.width / this.lastMergedIconCanvas.width;
        this.previewCanvas.canvasContext.scale(scaleFactor, scaleFactor);
        this.previewCanvas.canvasContext.drawImage(this.lastMergedIconCanvas, 0, 0);
    }

    generateFlatIconFromImage = (dataURL) => {
        return Util.loadToCanvas(dataURL).then((image) => {
            this.lastCroppedIconCanvas = Util.cropVisibleImageToNewCanvas(image);

            const iconPadding = this.configurationControls.iconPadding;
            const iconBackground = this.configurationControls.iconBackground;
            const iconShape = this.configurationControls.iconShape;
            const shadowAngle = this.configurationControls.shadowAngle;
            const shadowLength = this.configurationControls.shadowLength;
            const shadowOpacity = this.configurationControls.shadowOpacity;

            const widthWithPadding = this.lastCroppedIconCanvas.width * iconPadding + this.lastCroppedIconCanvas.width;
            const heightWithPadding = this.lastCroppedIconCanvas.height * iconPadding + this.lastCroppedIconCanvas.height;
            const iconDiameter = Util.diameterForDimensions(widthWithPadding, heightWithPadding);
            this.lastIconBackground = Util.createIconBackground(iconBackground, iconShape, iconDiameter);
            this.lastPaddedIconCanvas = Util.centerCanvas(this.lastCroppedIconCanvas, iconDiameter, iconDiameter);
            this.lastUnmergedIconCanvas = Util.drawShadow(this.lastPaddedIconCanvas, shadowAngle, shadowLength, shadowOpacity);
            this.lastMergedIconCanvas = Util.mergeIconWithBackground(this.lastUnmergedIconCanvas, this.lastIconBackground);

            // Update the icon preview
            this.updatePreview();

            // Enable the download button.
            this.downloadButtonController.enableDownloadButton();
        });
    }

    downloadIcon = () => {
        // Set link properties
        const downloadButton = this.downloadButtonController.downloadButton;
        downloadButton.href = this.lastMergedIconCanvas.toDataURL();
        downloadButton.download = 'icon.png';
    }
}

function onLoad() {
    const configurationControls = new ConfigurationControls({
        colorPickerId: "colorPicker",
        shapePickerId: "shapePicker",
        paddingPickerId: "paddingPicker",
        anglePickerId: "anglePicker",
        opacityPickerId: "opacityPicker",
        lengthPickerId: "lengthPicker",
    });

    const previewCanvas = new PreviewCanvas({
        canvasId: "canvas",
    });

    const uploadListener = new UploadListener({
        dropZoneId: "drop_zone",
        uploadButtonId: "upload_button",
        fileId: "files",
    });

    const iconLibrarySelectionListener = new IconLibrarySelectionListener({
        selectorId: "icons",
    });

    const downloadButtonController = new DownloadButtonController({
        downloadButtonId: "download",
    });

    new AppController({
        configurationControls,
        previewCanvas,
        uploadListener,
        iconLibrarySelectionListener,
        downloadButtonController,
    });
}

window.addEventListener('load', onLoad);
