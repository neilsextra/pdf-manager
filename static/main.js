/**
 * Constants
 * 
 */
var slidesPerView = 8;
var RATIO = 1.5;
var swiper = null;
var __filename = null;
var __cloud = null;
var __bucket = null;
var __pages = {};

function close_panel(id) {

    $(id).css('display', 'none');

}

function drawBoundingBox(canvas, bounds) {
    var context = canvas.getContext('2d');

    var width = context.canvas.width;
    var height = context.canvas.height;

    var x1 = parseFloat(bounds['start_x']);
    var y1 = parseFloat(bounds['start_y']);

    var x2 = parseFloat(bounds['end_x']);
    var y2 = parseFloat(bounds['end_y']);

    var x = (width * x1) + (width * 0.1);
    var y = (height * y1) + (height * 0.1);

    var boxWidth = x2 - x1;
    var boxHeight = y2 - y1;

    var w = width * boxWidth;
    var h = height * boxHeight;

    console.log(`Width ${width}, Height : ${height}, x: ${x}, y: ${y}, w: ${w}, h: ${h}, x1:${x1}, y1:${y1}, w:${x2 - x1}, h:${y2 - y1}`);

    context.fillStyle = "rgba(255, 255, 0, 0.5)";
    context.fillRect(x, y, w, h);

}

function parseParameters(str) {
    var l = str.slice(1,-1).split('&');
    var d = {};
    
    for (var i in l) {
        var a = l[i].split('=');
        d[a[0].trim()] = a[1].trim();
    }

    return d;

}

$.fn.Select = async (filename, bucket) => {
    $('#waitMessage').text("Generating PDF");
    $('#waitDialog').css('display', 'inline-block');
    $('#analzye').css('color', '#006DF0');

    var pdf = await __cloud.retrieve(bucket, filename);
    var canvases = await convert(pdf, RATIO);

    var display = $('#display')[0];

    while (display.firstChild) {
        display.removeChild(display.firstChild);
    }

    for (var canvas in canvases) {
        var div = document.createElement('div');

        div.style.width = "100%";
        div.style.height = "100%";
        div.className = "page";
        div.id = `page-${parseInt(canvas) + 1}`;

        if (canvas == 0) {
            div.style.display = "inline-block";
        } else {
            div.style.display = "none";
        }

        div.appendChild(canvases[canvas]);

        $('#display')[0].appendChild(div);

    }

    var pages = $('#pages')[0];

    while (pages.firstChild) {
        pages.removeChild(pages.firstChild);
    }

    for (var canvas = 0; canvas < canvases.length; canvas++) {
        var button = document.createElement('button');

        button.className = (canvas == 0) ? "round-button-selected" : "round-button-unselected";
        button.textContent = `${canvas + 1}`;
        button.addEventListener("click", function (event) {
            var elements = document.getElementsByClassName("round-button-selected");

            var currentPageID = `page-${elements[0].textContent}`;
            var selectedPageID = `page-${event.target.textContent}`;

            elements[0].className = "round-button-unselected";
            event.target.className = "round-button-selected";;

            document.getElementById(currentPageID).style.display = 'none';
            document.getElementById(selectedPageID).style.display = 'inline-block';

        });

        pages.appendChild(button);

    }

    $('#display').css('display', 'inline-block');
    $('#waitDialog').css('display', 'none');

    $('#summary').text('');

    $("#analyze").children().prop('disabled', false);
    $("#analyze").css('color', ' #006DF0');

    $('#fileName').text(`${filename}`);

    $.fn.Filename = filename;

}

$.fn.Query = () => {

    /**
     * Create each Swiper Entry
     * 
     * @param {string} directoryName the Directory/Folder
     * @param {string} fileName the Name of the FIle
     */
    function createSwiperEntry(entry) {
        var html = $('#swiper-wrapper').html();
        var swiperEntry = generateSwiperEntry(html, entry, $('#cloud-bucket').val());

        $('#swiper-wrapper').html(swiperEntry);

        if (swiper) {
            swiper.update();
        } else {
            swiper = createSwipperControl();

        }

    }

    /**
     * Generate Swiper Entry
     * 
     * @param {*} html 
     * @param {*} filename  
     */
    function generateSwiperEntry(html, entry, bucket) {

        var pageHtml = html + `<div class="swiper-slide" style="border:2px solid #0174DF; padding:5px; width:180px; " onclick='$(this).Select("${entry['name']}", "${bucket}");'> ` +
            `<div id="id-${entry['name']}" style="width:180px; height:150px; margin:auto; overflow:hidden;"/>` +
            "<img  " +
            `src='${('modelId' in entry ? pdfImageModel : pdfImageNoModel)}'` +
            "' style='position:absolute; display:block; width:128px; height:128px; top:10px; left:10px;'></img> " +
            ` <label style='position:absolute; display:block; font-size:14px; bottom:0px; left:0px; width:100%; color:#0174DF; text-overflow: ellipsis; z-index:99; ` +
            ` background-color:rgb(0, 0, 0, 0.1);'>&nbsp;${entry['name']}</label>` +
            `</div>` +

            `<div class="play">` +
            `<img src="${expandImage}" style="width:64px; height:64px; z-index:100;"/></div>` +
            " </div>";

        return pageHtml;

    }
    $('#waitMessage').text("Retrieving Files");
    $('#waitDialog').css('display', 'inline-block');

    console.log($('#cloud-end-point').val(), $('#cloud-key-id').val(), $('#cloud-instance-crn').val());

    __cloud = new Cloud($('#cloud-end-point').val(), $('#cloud-key-id').val(), $('#cloud-instance-crn').val());

    __cloud.query($('#cloud-bucket').val()).then(result => {
        var paths = result.response.paths;

        $('#swiper-wrapper').html("");

        for (var path in paths) {

            createSwiperEntry(paths[path]);

        }

        $('#waitMessage').text("");
        $('#waitDialog').css('display', 'none');

    });

}

/**
 * Create a swiper control
 * @return the newly constructed swiper control
 */
function createSwipperControl() {

    var swiper = new Swiper('.swiper-container', {
        centeredSlides: false,
        spaceBetween: 10,
        slidesPerView: 'auto',
        CSSWidthAndHeight: true,
        breakpointsInverse: true,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },

    });

    return swiper;

}

/**
 * Generate the PDFs 
 * @param {*} id the id for messages
 * @param {*} content the PDF Content 

 */
async function convert(content, scale) {

    function generatePage(pdf, pageNo) {

        return new Promise((accept, reject) => {

            pdf.getPage(pageNo).then(function (page) {

                function createCanvas(scale) {
                    var viewport = page.getViewport({ scale: scale });

                    // Prepare canvas using PDF page dimensions.
                    var canvas = document.createElement('canvas')

                    var context = canvas.getContext('2d');

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    canvas.id = `canvas-${pageNo}`;

                    // Render PDF page into canvas context.
                    var renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };

                    page.render(renderContext);

                    return canvas;

                }

                accept(createCanvas(scale));

            });

        });

    }

    return new Promise((accept, reject) => {
        var loadingTask = pdfjsLib.getDocument({ data: content });

        loadingTask.promise.then(async function (pdf) {
            var numPages = pdf.numPages;
            var canvases = []

            for (var pageNo = 1; pageNo <= numPages; pageNo++) {
                canvases.push(await generatePage(pdf, pageNo));
            }

            accept(canvases);

        });

    });

}

$(function () {
    $('#connect').on('click', (e) => {

        $('#close-connect').css('display', 'inline-block');
        $('#cancel_cloud_connect_button').css('display', 'inline-block');

        $('#cloud-connect').css('display', 'inline-block');

        var display = $('#display')[0];

        while (display.firstChild) {
            display.removeChild(display.firstChild);
        }

        return false;

    });

    $('#analyze').on('click', (e) => {

        if ($('#fileName').text().length == 0) {
             e.preventDefault();
             return false;
        }

        $('#analyze-form').css('display', 'inline-block');

        return false;

    });

    var dropzone = $('#droparea');

    dropzone.on('dragover', function () {
        dropzone.addClass('hover');
        return false;
    });

    dropzone.on('dragleave', function () {
        dropzone.removeClass('hover');
        return false;
    });

    dropzone.on('drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
        dropzone.removeClass('hover');

        //retrieve uploaded files data
        var files = e.originalEvent.dataTransfer.files;
        processFiles(files);

        return false;

    });

    var uploadBtn = $('#uploadbtn');
    var defaultUploadBtn = $('#upload');

    uploadBtn.on('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        defaultUploadBtn.click();
    });

    defaultUploadBtn.on('change', function () {
        var files = $(this)[0].files;

        processFiles(files);

        return false;

    });

    $('#ok_cloud_connect_button').on('click', (e) => {

        if ($("#cloud-end-point").val().trim() == "" ||
            $("#cloud-key-id").val().trim() == "" ||
            $("#cloud-instance-crn").val().trim() == "") {
            $('#cloud-message').text("All fields must be completed");
        } else {
            try {
                $(this).Query();
                $('#cloud-connect').css('display', 'none');
            } catch (e) {
                $('#cloud-message').text(e);
            }
        }

        return false;

    });

    $('#ok_analyze_button').on('click', async (e) => {
        console.log(`Analyze: '${$('#analyze-url').val()}' - '${$('#fileName').text()}'`);

        $('#waitDialog').css('display', 'inline-block');
        $('#waitMessage').text(`Analyzing file: '${$('#fileName').text()}'`);

        let result = await __cloud.analyze($('#cloud-bucket').val(),
            $('#fileName').text(),
            $('#analyze-url').val(),
            $('#analyze-token').val());

        let complete = false;
        let submissionId = result['submission_id'];

        console.log("Submission ID: " + submissionId);

        let attempt = 1;
        let response = "";

        while (!complete) {
            $('#waitMessage').text(`Processing file : '${$('#fileName').text()}' - Taken : [${attempt}] seconds`);

            response = await __cloud.receive($('#analyze-url').val(),
                $('#analyze-token').val(),
                submissionId);

            if (response.hasOwnProperty("state")) {

                if (response.state == "complete" || response.state == "supervision" || response.state == "failed") {
                    complete = true;
                }

            }

            attempt = attempt + 1;

        }

        $('#waitMessage').text("");
        $('#waitDialog').css('display', 'none');
        $('#analyze-form').css('display', 'none');

        var html = "";

        var image_urls = {};

        for (var file in response['documents']) {

            if (file) {

                for (var page in response['documents'][file]['pages']) {
                    var content = response['documents'][file]['pages'][page];

                    console.log("Image URL", content['corrected_image_url']);
                    image_urls[content['corrected_image_url']] = content;

                }

                console.log("Image URLS:", image_urls);

                __pages = {};

                console.log(JSON.stringify(response['documents'][file]['document_fields']));

                for (var field in response['documents'][file]['document_fields']) {
                    var value = response['documents'][file]['document_fields'][field];           
                    let url = value['field_image_url'].substring(0, value['field_image_url'].indexOf('?')).trim();
                    let parameters = value['field_image_url'].substring(value['field_image_url'].indexOf('?'));

                    console.log(field, url, parameters);
                    console.log("File Page Number: ", "'" + image_urls[url]['file_page_number'] + "'");
 
                    if (!(image_urls[url]['file_page_number'] in __pages)) {

                        __pages[image_urls[url]['file_page_number']] = [];

                    }

                    var content = JSON.stringify(value['transcription']['raw']).replaceAll('"', '').replaceAll("\\n", "<br/>");

                    var cell = {};

                    cell['id'] = parseInt(field) + 1;
                    cell['name'] = JSON.stringify(value['name']).replaceAll('"', '');
                    cell['content'] = content.length == 0 ? "<i>No Value</i>" : content;
                    cell['position'] = parseParameters(parameters);

                    console.log("Position: ", cell['position']);

                    __pages[image_urls[url]['file_page_number']].push(cell);

                }

                console.log(JSON.stringify(__pages));

                for (var page in __pages) {

                    html += `<h2>Page: ${page}</h2><hr></hr>`;

                    for (var field in __pages[page]) {

                        html += `<h3>Field: ${__pages[page][field]['id']}</h3>`;
                        html += `<p style="font-size:12px; font-weight:bold;">`;
                        html += `${__pages[page][field]['name']}</p>`;
                        html += `<p style="font-size:10px; font-weight:normal;">`;                
                        html += `${__pages[page][field]['content']}</p>`;

                        drawBoundingBox(document.getElementById(`canvas-${page}`), __pages[page][field]['position']);
  
                    }
                    
                }

            }

        }

        $('#summary').html(html);

    });

    /**
     * Process uploaded files
     * 
     * @param {file[]} files an array of files
     * 
     */
    async function processFiles(files) {

        $('#waitMessage').text("");
        $('#waitDialog').css('display', 'inline-block');

        for (var file = 0; file < files.length; file++) {

            $('#waitMessage').text(`Uploading : '${files[file].name}'`);

            var result = await postData(files[file]);

        }

        $(this).Query();

        $('#waitMessage').text("");
        $('#waitDialog').css('display', 'none');

    }

    function getSize(file) {

        return new Promise((accept, reject) => {
            var reader = new FileReader();

            reader.onload = function () {

                accept(reader.result.byteLength);

            };

            reader.readAsArrayBuffer(file);

        });
    }

    /**
     * Post the Data to the Server in Chunks
     * 
     * @param {string} filename Filename
     * @param {array} buffer Buffer
     * 
     */
    function postData(file) {

        return new Promise(async (accept, reject) => {
            var formData = new FormData();

            __cloud.setup(formData);
            formData.append(file.name, file);

            formData.append('bucket', $('#cloud-bucket').val());

            $.ajax({
                url: '/upload',
                type: 'POST',
                processData: false,
                cache: false,
                contentType: false,
                processData: false,
                async: true,
                data: formData,

                xhr: function () {
                    var xhr = $.ajaxSettings.xhr();

                    xhr.upload.addEventListener('progress', function (event) {
                        if (event.lengthComputable) {
                            var percentComplete = event.loaded / event.total;

                            $('#waitMessage').text(`Loading...`);

                        }
                    }, false);

                    xhr.upload.addEventListener('load', function (event) { }, false);

                    return xhr;

                },
                error: function (err) {
                    console.log(`Error: [${err.status}] - ' ${err.statusText}'`);
                    alert(`Error: [${err.status}] - ' ${err.statusText}'`);
                    $('#waitDialog').css('display', 'none');

                    reject(err.status);

                },
                success: function (result) {
                    $('#waitMessage').text(`Loaded File...`);
                    console.log(`Result: ${JSON.parse(result)[0].status}`);

                    accept(200);

                }

            });

        })

    }

});