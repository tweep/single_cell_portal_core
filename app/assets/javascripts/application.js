// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or any plugin's vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery2
//= require jquery_ujs
//= require ckeditor/init
//= require dataTables/jquery.dataTables
//= require dataTables/bootstrap/3/jquery.dataTables.bootstrap
//= require jquery.bootstrap.wizard
//= require jquery-fileupload
//= require jquery-fileupload/basic-plus
//= require jquery_nested_form
//= require spin.min
//= require jquery-ui/core
//= require jquery-ui/widgets/datepicker
//= require jquery-ui/widgets/autocomplete
//= require jquery-ui/widgets/sortable
//= require jquery-ui/widgets/dialog
//= require jquery-ui/effects/effect-highlight
//= require bootstrap-sprockets
//= require jquery.actual.min
//= require autocomplete-rails
//= require bootstrap-select.min
//= require canvas2svg
//= require canvg
//= require colorbrewer
//= require d3.min
//= require FileSaver.min
//= require hammer.min
//= require jquery.event.drag-2.2
//= require jquery.mousewheel.min
//= require newick
//= require papaparse.min
//= require parser
//= require rgbcolor
//= require slick.min
//= require StackBlur
//= require tsne
//= require underscore-min
//= require xlsx.full.min
//= require morpheus-latest.min
//= require kernel-functions
//= require simple-statistics.min
//= require sheather_jones
//= require jquery.stickyPanel

var fileUploading = false;
var PAGE_RENDERED = false;
var OPEN_MODAL = '';
var CLUSTER_TYPE = '3d';

$(document).on('shown.bs.modal', function(e) {
    console.log("modal " + $(e.target).attr('id') + ' opened');
    OPEN_MODAL = $(e.target).attr('id');
});

$(document).on('hidden.bs.modal', function(e) {
    console.log("modal " + $(e.target).attr('id') + ' closed');
    OPEN_MODAL = '';
});

jQuery.railsAutocomplete.options.noMatchesLabel = "No matches in this study";

// used for calculating size of plotly graphs to maintain square aspect ratio
var SCATTER_RATIO = 0.65;

function elementVisible(element) {
    return $(element).is(":visible");
}

function paginateStudies(totalPages, order, searchString) {

    var paginationOpts = {
        lines: 11, // The number of lines to draw
        length: 15, // The length of each line
        width: 5, // The line thickness
        radius: 10, // The radius of the inner circle
        scale: 1, // Scales overall size of the spinner
        corners: 1, // Corner roundness (0..1)
        color: '#000', // #rgb or #rrggbb or array of colors
        opacity: 0.25, // Opacity of the lines
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        speed: 1, // Rounds per second
        trail: 60, // Afterglow percentage
        fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
        zIndex: 2e9, // The z-index (defaults to 2000000000)
        className: 'spinner', // The CSS class to assign to the spinner
        top: '12px',  // Top position relative to parent
        left: '50%',  // Left position relative to parent
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        position: 'relative' // Element positioning
    };

    var target = document.getElementById("pagination");
    var spinner = new Spinner(paginationOpts).spin(target);
    var page = parseInt($($(".study-panel").slice(-1)[0]).attr("data-page")) + 1;
    var dataParams = {};
    dataParams["page"] = page;
    if (order != "") {
        dataParams["order"] = order;
    }
    if (searchString != "") {
        dataParams["search_terms"] = searchString;
    }
    $("#pagination").fadeOut("fast", function() {
            $.ajax({
                url: "/single_cell",
                data: dataParams,
                dataType: "script",
                type: "GET",
                success: function(data){
                    spinner.stop();
                    $(".glyphicon").tooltip();
                    if ( dataParams["page"] != totalPages ) {
                        $("#pagination").fadeIn("fast");
                        $(window).bind('scroll', bindScroll);
                    }
                }
            });
        }
    );
}


// used for keeping track of position in wizard
var completed = {
    initialize_expression_form_nav: false,
    initialize_metadata_form_nav: false,
    initialize_ordinations_form_nav: false,
    initialize_marker_genes_form_nav: false,
    initialize_primary_data_form_nav: false,
    initialize_misc_form_nav: false
};

function completeWizardStep(step) {
    completed[step] = true;
    return completed;
}

function resetWizardStep(step) {
    completed[step] = false;
    $('#' + step + '_completed').html("");
    setWizardProgress(getWizardStatus());
    return completed;
}

// get current status of upload/initializer wizard
function getWizardStatus() {
    var done = 0;
    for (var step in completed) {
        if (completed[step] === true) {
            done++;
        }
    }
    return done;
}

function setWizardProgress(stepsDone) {
    var steps = parseInt(stepsDone);
    var totalSteps = $('li.wizard-nav').length;
    var totalCompletion = Math.round((steps/totalSteps) * 100);
    $('#bar').find('.progress-bar').css({width:totalCompletion+'%'});
    $('#progress-count').html(totalCompletion+'% Completed');
}

function showSkipWarning(step) {
    if (['initialize_ordinations_form_nav', 'initialize_metadata_form_nav', 'initialize_expression_form_nav'].indexOf(step) >= 0) {
        return (!completed.initialize_ordinations_form_nav || !completed.initialize_metadata_form_nav || !completed.initialize_expression_form_nav)
    } else {
        return false;
    }
}

// toggle chevron glyphs on clicks
function toggleGlyph(el) {
    el.toggleClass('fa-chevron-right fa-chevron-down');
}

// attach various handlers to bootstrap items and turn on functionality
function enableDefaultActions() {
    // need to clear previous listener to prevent conflict
    $('.panel-collapse').off('show.bs.collapse hide.bs.collapse');

    $('.panel-collapse').on('show.bs.collapse hide.bs.collapse', function() {
        toggleGlyph($(this).prev().find('span.toggle-glyph'));
    });

    $('.datepicker').datepicker({dateFormat: 'yy-mm-dd'});

    $('body').tooltip({selector: '[data-toggle="tooltip"]', container: 'body'});
    $('[data-toggle="popover"]').popover();

    // warns user of in progress uploads, fileUploading is set to true from fileupload().add()
    $('.check-upload').click(function() {
        if (fileUploading) {
            if (confirm("You still have file uploads in progress - leaving the page will cancel any incomplete uploads.  " +
                "Click 'OK' to leave or 'Cancel' to stay.  You may open another tab to continue browsing if you wish."))
            {
                return true;
            } else {
                return false;
            }
        }
    });

    // handler for file deletion clicks, need to grab return value and pass to window
    $('.delete-file').click(function() {
        new Promise(function(resolve) {
            return deleteFileConfirmation('Are you sure?  This file will be deleted and any associated database records removed.  This cannot be undone.', resolve)
        }).then(function(answer) {
            return(answer);
        });
    });

    // handler for file deletion clicks, need to grab return value and pass to window
    $('.delete-file-sync').click(function() {
        new Promise(function(resolve) {
            return deleteFileConfirmation('Are you sure?  This will remove any database records associated with this file.  This cannot be undone.', resolve)
        }).then(function(answer) {
            return(answer);
        });
    });
}

// generic warning and spinner for deleting files
function deleteFileConfirmation(confMessage, resolve) {
    var conf = confirm(confMessage);
    if ( conf === true ) {
        launchModalSpinner('#delete-modal-spinner','#delete-modal', function() {
            return resolve(true);
        });
    } else {
        return resolve(false);
    }
}

var stickyOptions = {
    topPadding: 85
};
// toggle the Search/View options panel
function toggleSearch() {
    $('#search-target').toggleClass('col-md-3 hidden');
    $('#render-target').toggleClass('col-md-9 col-md-12');
    $('#search-options-panel').toggleClass('hidden');
    $('#show-search-options').toggleClass('hidden');
    if ( $('#show-search-options').css('display') === 'none' ) {
        $('#show-search-options').tooltip('hide');
    }

    // trigger resizeEnd to re-render Plotly to use available space
    $(window).trigger('resize');
    if ($('#create_annotations_panel').length > 0) {if($('#search-target').is(":visible")){
        $('#search-parent').stickyPanel(stickyOptions)
    } else{
        $('#search-parent').stickyPanel('unstick')}
    }
}

// options for Spin.js
var opts = {
    lines: 13, // The number of lines to draw
    length: 56, // The length of each line
    width: 14, // The line thickness
    radius: 42, // The radius of the inner circle
    scale: 1, // Scales overall size of the spinner
    corners: 1, // Corner roundness (0..1)
    color: '#000', // #rgb or #rrggbb or array of colors
    opacity: 0.25, // Opacity of the lines
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    className: 'spinner', // The CSS class to assign to the spinner
    top: '50%', // Top position relative to parent
    left: '50%', // Left position relative to parent
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    position: 'absolute' // Element positioning
};

var smallOpts = {
    lines: 11, // The number of lines to draw
    length: 9, // The length of each line
    width: 3, // The line thickness
    radius: 4, // The radius of the inner circle
    scale: 1,  // Scales overall size of the spinner
    corners: 1, // Corner roundness (0..1)
    color: '#000',  // #rgb or #rrggbb or array of colors
    opacity: 0.25,  // Opacity of the lines
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    fps: 20,  // Frames per second when using setTimeout() as a fallback for CSS
    zIndex: 2e9,  // The z-index (defaults to 2000000000)
    className: 'spinner',  // The CSS class to assign to the spinner
    top: '7px',  // Top position relative to parent
    left: '50%',  // Left position relative to parent
    shadow: false,  // Whether to render a shadow
    hwaccel: false,  // Whether to use hardware acceleration
    position: 'relative' // Element positioning
};

// functions to show loading modals with spinners
// callback function will execute after modal completes opening
function launchModalSpinner(spinnerTarget, modalTarget, callback) {
    // set listener to fire callback, and immediately clear listener to prevent multiple requests queueing
    $(modalTarget).on('shown.bs.modal', function() {
        $(modalTarget).off('shown.bs.modal');
        callback();
    });

    $(spinnerTarget).empty();
    var target = $(spinnerTarget)[0];
    var spinner = new Spinner(opts).spin(target);
    $(target).data('spinner', spinner);
    $(modalTarget).modal('show');
    console.log('finished')
};

// function to close modals with spinners launched from launchModalSpinner
// callback function will execute after modal completes closing
function closeModalSpinner(spinnerTarget, modalTarget, callback) {
    // set listener to fire callback, and immediately clear listener to prevent multiple requests queueing
    $(modalTarget).on('hidden.bs.modal', function() {
        $(modalTarget).off('hidden.bs.modal');
        callback();
    });
    $(spinnerTarget).data('spinner').stop();
    $(modalTarget).modal('hide');
}

// default title font settings for axis titles in plotly
var plotlyTitleFont = {
    family: 'Helvetica Neue',
    size: 16,
    color: '#333'
};

// default label font settings for colorbar titles in plotly
var plotlyLabelFont = {
    family: 'Helvetica Neue',
    size: 12,
    color: '#333'
};

var plotlyDefaultLineColor = 'rgb(40, 40, 40)';

// default scatter plot colors, a combination of colorbrewer sets 1-3 with tweaks to the yellow members
var colorBrewerSet = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#a65628", "#f781bf", "#999999",
    "#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3", "#8dd3c7",
    "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"];

// clear out text area in a form
function clearForm(target) {
    $('#' + target).val("");
}

// set error state on blank text boxes or selects
function setErrorOnBlank(selector) {
    selector.map(function() {
        if ( $(this).val() === "" ) {
            $(this).parent().addClass('has-error has-feedback');
        } else {
            $(this).parent().removeClass('has-error has-feedback');
        }
    });
}

// custom event to trigger resize event only after user has stopped resizing the window
$(window).resize(function() {
    if(this.resizeTO) clearTimeout(this.resizeTO);
    this.resizeTO = setTimeout(function() {
        $(this).trigger('resizeEnd');
        console.log('resizeEnd');
    }, 100);
});

// generic function to render Morpheus
function renderMorpheus(dataPath, annotPath, selectedAnnot, selectedAnnotType, target, annotations, fitType, heatmapHeight) {
    console.log('render status of ' + target + ' at start: ' + $(target).data('rendered'));
    $(target).empty();
    var config = {dataset: dataPath, el: $(target), menu: null};

    // set height if specified, otherwise use default setting of 500 px
    if (heatmapHeight !== undefined) {
        config.height = heatmapHeight;
    } else {
        config.height = 500;
    }

    // fit rows, columns, or both to screen
    if (fitType === 'cols') {
        config.columnSize = 'fit';
    } else if (fitType === 'rows') {
        config.rowSize = 'fit';
    } else if (fitType === 'both') {
        config.columnSize = 'fit';
        config.rowSize = 'fit';
    } else {
        config.columnSize = null;
        config.rowSize = null;
    }

    // load annotations if specified
    if (annotPath !== '') {
        config.columnAnnotations = [{
            file : annotPath,
            datasetField : 'id',
            fileField : 'NAME',
            include: [selectedAnnot]}
        ];
        config.columnSortBy = [
            {field: selectedAnnot, order:0}
        ];
        config.columns = [
            {field:'id', display:'text'},
            {field: selectedAnnot, display: selectedAnnotType === 'group' ? 'color' : 'bar'}
        ];
        // create mapping of selected annotations to colorBrewer colors
        var annotColorModel = {};
        annotColorModel[selectedAnnot] = {};
        var sortedAnnots = annotations['values'].sort();

        // calling % 27 will always return to the beginning of colorBrewerSet once we use all 27 values
        $(sortedAnnots).each(function(index, annot) {
            annotColorModel[selectedAnnot][annot] = colorBrewerSet[index % 27];
        });
        config.columnColorModel = annotColorModel;
    }

    // instantiate heatmap and embed in DOM element
    var heatmap = new morpheus.HeatMap(config);

    // set render variable to true for tests
    $(target).data('morpheus', heatmap);
    $(target).data('rendered', true);
    console.log('render status of ' + target + ' at end: ' + $(target).data('rendered'));

}

// toggles visibility and disabled status of file upload and fastq url fields
function toggleFastqFields(target) {
    var selector = $("#" + target);
    var fileField = selector.find('.upload-field');
    $(fileField).toggleClass('hidden');
    var fastqField = selector.find('.fastq-field');
    $(fastqField).toggleClass('hidden');
    // toggle disabled status by returning inverse of current state
    $(fastqField).find('input').attr('disabled', !$(fastqField).find('input').is('[disabled=disabled]'));
    // set human data attr to true
    var humanData = $(fastqField).find('input[type=hidden]');
    $(humanData).val($(humanData).val() === 'true' ? 'false' : 'true' );
    // enable name field & update button to allow saving
    var saveBtn = selector.find('.save-study-file');
    $(saveBtn).attr('disabled', !$(saveBtn).is('[disabled=disabled]'));
    var nameField = selector.find('.filename');
    $(nameField).attr('readonly', !$(nameField).is('[readonly=readonly]'));
    $(nameField).attr('placeholder', '');
    // animate highlight effect to show fields that need changing
    $(nameField).parent().effect('highlight', 1200);
    $(fastqField).effect('highlight', 1200);
}

// function to toggle all traces in a Plotly div
function togglePlotlyTraces(div) {
    console.log('toggling all traces in ' + div);
    var plotlyData = document.getElementById(div).data;
    var visibility = plotlyData[0].visible;

    // if visibility is undefined or true, that means it is visible and we want to set this to 'legendonly'
    // when visibility === 'legendonly', we can set this back to true to show all traces
    if( visibility === undefined || visibility === true) {
        visibility = 'legendonly';
    } else {
        visibility = true
    }

    Plotly.restyle(div, 'visible', visibility);
    // toggle class of toggle glyph
    $('#toggle-traces').children().toggleClass('fa-toggle-on fa-toggle-off');
    console.log('toggle complete in ' + div + '; visibility now ' + visibility);
}


// function to return a plotly histogram data object from an array of input values
function formatPlotlyHistogramData(valuesHash, offset) {
    var dataArray = [];
    var i = offset;
    if (i === undefined) {
        i = 0;
    }
    $.each(valuesHash, function(keyName, distData) {
        var trace = {
            x: distData,
            type: 'histogram',
            name: keyName,
            histnorm: '',
            autobinx: false,
            xbins: {
                start: Math.min.apply(Math, distData) - 0.5,
                end: Math.max.apply(Math, distData) + 0.5,
                size: 1
            },
            marker: {
                color: colorBrewerSet[i]
            }
        };
        dataArray.push(trace);
        i++;
    });
    return dataArray;
}

// load column totals for bar charts
function loadBarChartAnnotations(plotlyData) {
    var annotationsArray = [];
    for (var i = 0; i < plotlyData[0]['x'].length ; i++){
        var total = 0;
        plotlyData.map(function(el) {
            var c = parseInt(el['y'][i]);
            if (isNaN(c)) {
                c = 0;
            }
            total += c;
        });
        var annot = {
            x: plotlyData[0]['x'][i],
            y: total,
            text: total,
            xanchor: 'center',
            yanchor: 'bottom',
            showarrow: false,
            font: {
                size: 12
            }
        };
        annotationsArray.push(annot);
    }
    return annotationsArray;
}

// load bin counts for histogram charts
function loadHistogramAnnotations(plotlyData) {
    var annotationsArray = [];
    var counts = plotlyData[0]['x'];
    $(counts).each(function(i, c) {
        var count = counts.filter(function(a){return (a === c)}).length;
        var annot = {
            x: c,
            y: count,
            text: count,
            xanchor: 'center',
            yanchor: 'bottom',
            showarrow: false,
            font: {
                size: 12
            }
        };
        annotationsArray.push(annot);
    });

    return annotationsArray;
}

// validate uniquity of entries for various kinds of forms
function validateUnique(formId, textFieldClass) {
    $(formId).find(textFieldClass).change(function() {
        var textField = $(this);
        var newName = textField.val().trim();
        var names = [];
        $(textFieldClass).each(function(index, name) {
            var n = $(name).val().trim();
            if (n !== '') {
                names.push(n);
            }
        });
        // check if there is more than one instance of the new name, this will mean it is a dupe
        if (names.filter(function(n) {return n === newName}).length > 1) {
            alert(newName + ' has already been used.  Please provide a different name.');
            textField.val('');
            textField.parent().addClass('has-error');
        } else {
            textField.parent().removeClass('has-error');
        }
    });
}

// function to call Google Analytics whenever AJAX call is made
// must be called manually from every AJAX success or js page render
function gaTracker(id){
    $.getScript('https://www.google-analytics.com/analytics.js'); // jQuery shortcut
    window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
    ga('create', id, 'auto');
    ga('send', 'pageview');
}

function gaTrack(path, title) {
    ga('set', { page: path, title: title });
    ga('send', 'pageview');
}

// decode an HTML-encoded string
function unescapeHTML(encodedStr) {
    return $("<div/>").html(encodedStr).text();
}

// close the user annotations panel if open when rendering clusters
function closeUserAnnotationsForm() {
    if ( $('#selection_div').attr('class') === '' ) {
        console.log('closing user annotations form');
        // menu is open, so empty forms and reset button state
        $('#selection_div').html('');
        $('#selection_div').toggleClass('collapse');
        $('#toggle-scatter').children().toggleClass('fa-toggle-on fa-toggle-off');
    }
}