// ==UserScript==
// @name         WaniKani SRS Grid
// @namespace    http://tampermonkey.net/
// @version      5.5
// @description  try to take over the world!
// @author       You
// @match        https://wanikani.com/
// @match        https://wanikani.com/dashboard
// @match        https://www.wanikani.com/
// @match        https://www.wanikani.com/dashboard
// @match        https://preview.wanikani.com/
// @match        https://preview.wanikani.com/dashboard
// @icon          https://discourse-cdn-sjc1.com/business5/user_avatar/community.wanikani.com/daisukejigen/32/5701_2.png
// @grant        none
// ==/UserScript==

window.wk_srs_grid = {};
(function(global) {
    'use strict';
// Hook into App Store
    //try { $('.app-store-menu-item').remove(); $('<li class="app-store-menu-item"><a href="https://community.wanikani.com/t/there-are-so-many-user-scripts-now-that-discovering-them-is-hard/20709">App Store</a></li>').insertBefore($('.navbar .dropdown-menu .nav-header:contains("Account")')); window.appStoreRegistry = window.appStoreRegistry || {}; window.appStoreRegistry[GM_info.script.uuid] = GM_info; localStorage.appStoreRegistry = JSON.stringify(appStoreRegistry); } catch (e) {}

    if (!window.wkof) {
        if (confirm('WaniKani SRS Grid requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?'))
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        return;
    }

    wkof.include('Apiv2, ItemData, Menu, Settings');
    wkof.ready('Menu').then(install_menu);
    wkof.ready('ItemData, Settings').then(install_settings).then(get_items);

    var settings_dialog;
    var defaults = {
        gridMode: "Center/Center",
        extraBreakdown: false,
        includeInitiate: false,
        includeLocked: false
    };

    function killClean(){
        if($('.dashboard section.srs-progress ul li').css('display') == 'inline-flex') {
            if($.browser.mozilla === true){
                $('.srs-progress').addClass('noClean');
            } else {
                //Erase conflicting portions of Clean Dashboard CSS: Thanks to rfindley
                var found_css = false;
                var styles = $('style').each(function(i,v){
                    if (found_css) return;
                    css = $(v).html();
                    if (css.match(/-- SRS PROGRESS --/) === null) return;
                    found_css = true;
                    var css_arr = css.split('\n');
                    var len = css_arr.length;
                    css = '';
                    var deleting = false;
                    for (var idx=0; idx<len; idx++) {
                        var line = css_arr[idx];
                        if (!deleting) {
                            if (line.match(/-- SRS PROGRESS --/) !== null) {
                                deleting = true;
                            } else {
                                css += line + '\n';
                            }
                        } else {
                            if (line.match(/-- REVIEW STATUS --/) !== null) {
                                css += line + '\n';
                                deleting = false;
                            }
                        }
                    }
                    $(v).html(css);
                });
            }
        }
    }

    var by_srs;

    function install_menu() {
        wkof.Menu.insert_script_link({
            script_id: 'srsGrid',
            name: 'srsGrid',
            submenu:   'Settings',
            title:     'SRS Grid V2',
            on_click:  open_settings
        });
    }
    function open_settings() {
        settings_dialog.open();
    }
    function install_settings() {
        settings_dialog = new wkof.Settings({
            script_id: 'srsGrid',
            name: 'srsGrid',
            title: 'SRS Grid V2',
            on_save: process_settings,
            settings: {
                //'srsGid_pg_display': {type:'page',label:'Display',content:{
                //    'grp_detail': {type:'group',label:'Review Details',content:{
                'gridMode': {type:'dropdown',label:'Mode',content:{'left/right':'Left/Right','center/center':'Center/Center'},default:defaults.gridMode},
                'extraBreakdown': {type:'checkbox',label:'Breakdown by sublevel',default:defaults.extraBreakdown},
                'includeInitiate': {type:'checkbox',label:'Include Initiate',default:defaults.includeInitiate},
                'includeLocked': {type:'checkbox',label:'Include Locked',default:defaults.includeLocked}
                //    }}
                //}}
            }
        });
        settings_dialog.load().then(function(){
            wkof.settings.srsGrid= $.extend(true, {}, defaults,wkof.settings.srsGrid);
            settings_dialog.save();
        });
    }
    function process_settings(){
        settings_dialog.save();
        console.log('Settings saved!');
    }


    function makeTable(level){
        return "<table>" +
            "<tr><td class='progressDetailTableTDFirst'>Radicals</td><td class='progressDetailTableTDSecond'>" + level.radicals() + (level.sub == undefined ? "" : breakdown(level.sub.radicals)) + "</td></tr>" +
            "<tr><td class='progressDetailTableTDFirst'>Kanji</td><td class='progressDetailTableTDSecond'>" + level.kanji() + (level.sub == undefined ? "" : breakdown(level.sub.kanji)) + "</td></tr>" +
            "<tr><td class='progressDetailTableTDFirst'>Vocabulary</td><td class='progressDetailTableTDSecond'>" + level.vocabulary() + (level.sub == undefined ? "" : breakdown(level.sub.vocabulary)) + "</td></tr>" +
            "<tr><td class='progressDetailTableTDFirst'>Kana Vocab</td><td class='progressDetailTableTDSecond'>" + level.kana_vocabulary() + (level.sub == undefined ? "" : breakdown(level.sub.kana_vocabulary)) + "</td></tr>" +
            "<tr><td class='progressDetailTableTDFirst'>Total</td><td class='progressDetailTableTDSecond'>" + level.total() + (level.sub == undefined ? "" : breakdown(level.sub.total)) + "</td></tr>" +
            "<tr class='orBetter'><td class='progressDetailTableTDFirst'>Radicals</td><td class='progressDetailTableTDSecond'>" + level.plus.radicals() + "</td></tr>" +
            "<tr class='orBetter'><td class='progressDetailTableTDFirst'>Kanji</td><td class='progressDetailTableTDSecond'>" + level.plus.kanji() + "</td></tr>" +
            "<tr class='orBetter'><td class='progressDetailTableTDFirst'>Vocabulary</td><td class='progressDetailTableTDSecond'>" + level.plus.vocabulary() + "</td></tr>" +
            "<tr class='orBetter'><td class='progressDetailTableTDFirst'>Kana Vocab</td><td class='progressDetailTableTDSecond'>" + level.plus.kana_vocabulary() + "</td></tr>" +
            "<tr class='orBetter'><td class='progressDetailTableTDFirst'>Total</td><td class='progressDetailTableTDSecond'>" + level.plus.total() + "</td></tr>" +
            "<tr class='orWorse'><td class='progressDetailTableTDFirst'>Radicals</td><td class='progressDetailTableTDSecond'>" + level.minus.radicals() + "</td></tr>" +
            "<tr class='orWorse'><td class='progressDetailTableTDFirst'>Kanji</td><td class='progressDetailTableTDSecond'>" + level.minus.kanji() + "</td></tr>" +
            "<tr class='orWorse'><td class='progressDetailTableTDFirst'>Vocabulary</td><td class='progressDetailTableTDSecond'>" + level.minus.vocabulary() + "</td></tr>" +
            "<tr class='orWorse'><td class='progressDetailTableTDFirst'>Kana Vocab</td><td class='progressDetailTableTDSecond'>" + level.minus.kana_vocabulary() + "</td></tr>" +
            "<tr class='orWorse'><td class='progressDetailTableTDFirst'>Total</td><td class='progressDetailTableTDSecond'>" + level.minus.total() + "</td></tr>" +
            "</table>";
    }
    function breakdown(items){
        if(wkof.settings.srsGrid.extraBreakdown == false){
            return "";
        } else {
            var amounts = [];
            $.each(items,function(item,value){
                amounts.push(value());
            });
            return " (" + amounts.join('/') + ")";
        }
    }

    // Fetch the items from WK (and/or cache)
    function get_items() {
        wkof.ItemData.get_items('subjects,assignments')
            .then(process_items).then(srsGridStyling);
    }

    function count(level,type){
        if(by_srs[level] == undefined){
            return 0;
        } else {
            return $.grep(by_srs[level], function(n,i){return n.object == type;}).length;
        }
    }

    // Separate the items array into srs levels
    function process_items(items) {
        by_srs = wkof.ItemData.get_index(items,'srs_stage');
        var data = {
            locked: {
                radicals: function(){return count("-1","radical");},
                kanji: function(){return count("-1","kanji");},
                vocabulary: function(){return count("-1","vocabulary");},
                kana_vocabulary: function(){return count("-1","kana_vocabulary");},
                total: function(){return data.locked.radicals() + data.locked.kanji() + data.locked.vocabulary() + data.locked.kana_vocabulary();},
                plus: {
                    radicals: function(){ return data.locked.radicals(); },
                    kanji: function(){ return data.locked.kanji(); },
                    vocabulary: function(){ return data.locked.vocabulary(); },
                    kana_vocabulary: function(){ return data.locked.kana_vocabulary(); },
                    total: function(){return data.locked.total();}
                },
                minus: {
                    radicals: function(){ return data.locked.radicals(); },
                    kanji: function(){ return data.locked.kanji(); },
                    vocabulary: function(){ return data.locked.vocabulary(); },
                    kana_vocabulary: function(){ return data.locked.kana_vocabulary(); },
                    total: function(){return data.locked.total();}
                },
            },
            initiate: {
                radicals: function(){return count("0","radical");},
                kanji: function(){return count("0","kanji");},
                vocabulary: function(){return count("0","vocabulary");},
                kana_vocabulary: function(){return count("0","kana_vocabulary");},
                total: function(){return data.initiate.radicals() + data.initiate.kanji() + data.initiate.vocabulary() + data.initiate.kana_vocabulary();},
                plus: {
                    radicals: function(){ return data.initiate.radicals(); },
                    kanji: function(){ return data.initiate.kanji(); },
                    vocabulary: function(){ return data.initiate.vocabulary(); },
                    kana_vocabulary: function(){ return data.initiate.kana_vocabulary(); },
                    total: function(){return data.initiate.total();}
                },
                minus: {
                    radicals: function(){ return data.initiate.radicals(); },
                    kanji: function(){ return data.initiate.kanji(); },
                    vocabulary: function(){ return data.initiate.vocabulary(); },
                    kana_vocabulary: function(){ return data.initiate.kana_vocabulary(); },
                    total: function(){return data.initiate.total();}
                },
            },
            apprentice: {
                radicals: function(){var total = 0; $.each(this.sub.radicals,function(item,value){ total = total+value(); }); return total;},
                kanji: function(){var total = 0; $.each(this.sub.kanji,function(item,value){ total = total+value(); }); return total;},
                vocabulary: function(){var total = 0; $.each(this.sub.vocabulary,function(item,value){ total = total+value(); }); return total;},
                kana_vocabulary: function(){var total = 0; $.each(this.sub.kana_vocabulary,function(item,value){ total = total+value(); }); return total;},
                total: function(){return data.apprentice.radicals() + data.apprentice.kanji() + data.apprentice.vocabulary() + data.apprentice.kana_vocabulary();},
                sub:{
                    radicals:{
                        I: function(){return count("1","radical");},
                        II: function(){return count("2","radical");},
                        III: function(){return count("3","radical");},
                        IV: function(){return count("4","radical");}
                    },
                    kanji:{
                        I: function(){return count("1","kanji");},
                        II: function(){return count("2","kanji");},
                        III: function(){return count("3","kanji");},
                        IV: function(){return count("4","kanji");}
                    },
                    vocabulary:{
                        I: function(){return count("1","vocabulary");},
                        II: function(){return count("2","vocabulary");},
                        III: function(){return count("3","vocabulary");},
                        IV: function(){return count("4","vocabulary");}
                    },
                    kana_vocabulary:{
                        I: function(){return count("1","kana_vocabulary");},
                        II: function(){return count("2","kana_vocabulary");},
                        III: function(){return count("3","kana_vocabulary");},
                        IV: function(){return count("4","kana_vocabulary");}
                    },
                    total:{
                        I: function(){return data.apprentice.sub.radicals.I() + data.apprentice.sub.kanji.I() + data.apprentice.sub.vocabulary.I() + data.apprentice.sub.kana_vocabulary.I();},
                        II: function(){return data.apprentice.sub.radicals.II() + data.apprentice.sub.kanji.II() + data.apprentice.sub.vocabulary.II() + data.apprentice.sub.kana_vocabulary.II();},
                        III: function(){return data.apprentice.sub.radicals.III() + data.apprentice.sub.kanji.III() + data.apprentice.sub.vocabulary.III() + data.apprentice.sub.kana_vocabulary.III();},
                        IV: function(){return data.apprentice.sub.radicals.IV() + data.apprentice.sub.kanji.IV() + data.apprentice.sub.vocabulary.IV() + data.apprentice.sub.kana_vocabulary.IV();}
                    }
                },
                plus: {
                    radicals: function(){ return data.apprentice.radicals() + data.guru.plus.radicals(); },
                    kanji: function(){ return data.apprentice.kanji() + data.guru.plus.kanji(); },
                    vocabulary: function(){ return data.apprentice.vocabulary() + data.guru.plus.vocabulary(); },
                    kana_vocabulary: function(){ return data.apprentice.kana_vocabulary() + data.guru.plus.kana_vocabulary(); },
                    total: function(){return data.apprentice.plus.radicals() + data.apprentice.plus.kanji() + data.apprentice.plus.vocabulary() + data.apprentice.plus.kana_vocabulary();}
                },
                minus: {
                    radicals: function(){ return data.apprentice.radicals(); },
                    kanji: function(){ return data.apprentice.kanji(); },
                    vocabulary: function(){ return data.apprentice.vocabulary(); },
                    kana_vocabulary: function(){ return data.apprentice.kana_vocabulary(); },
                    total: function(){return data.apprentice.minus.radicals() + data.apprentice.minus.kanji() + data.apprentice.minus.vocabulary() + data.apprentice.minus.kana_vocabulary();}
                }
            },
            guru: {
                radicals: function(){var total = 0; $.each(this.sub.radicals,function(item,value){ total = total+value(); }); return total;},
                kanji: function(){var total = 0; $.each(this.sub.kanji,function(item,value){ total = total+value(); }); return total;},
                vocabulary: function(){var total = 0; $.each(this.sub.vocabulary,function(item,value){ total = total+value(); }); return total;},
                kana_vocabulary: function(){var total = 0; $.each(this.sub.kana_vocabulary,function(item,value){ total = total+value(); }); return total;},
                total: function(){return data.guru.radicals() + data.guru.kanji() + data.guru.vocabulary() + data.guru.kana_vocabulary();},
                sub:{
                    radicals:{
                        I: function(){return count("5","radical");},
                        II: function(){return count("6","radical");},
                    },
                    kanji:{
                        I: function(){return count("5","kanji");},
                        II: function(){return count("6","kanji");}
                    },
                    vocabulary:{
                        I: function(){return count("5","vocabulary");},
                        II: function(){return count("6","vocabulary");}
                    },
                    kana_vocabulary:{
                        I: function(){return count("5","kana_vocabulary");},
                        II: function(){return count("6","kana_vocabulary");}
                    },
                    total:{
                        I: function(){return data.guru.sub.radicals.I() + data.guru.sub.kanji.I() + data.guru.sub.vocabulary.I() + data.guru.sub.kana_vocabulary.I();},
                        II: function(){return data.guru.sub.radicals.II() + data.guru.sub.kanji.II() + data.guru.sub.vocabulary.II() + data.guru.sub.kana_vocabulary.II();}
                    }
                },
                plus: {
                    radicals: function(){ return data.guru.radicals() + data.master.plus.radicals(); },
                    kanji: function(){ return data.guru.kanji() + data.master.plus.kanji(); },
                    vocabulary: function(){ return data.guru.vocabulary() + data.master.plus.vocabulary(); },
                    kana_vocabulary: function(){ return data.guru.kana_vocabulary() + data.master.plus.kana_vocabulary(); },
                    total: function(){return data.guru.plus.radicals() + data.guru.plus.kanji() + data.guru.plus.vocabulary() + data.guru.plus.kana_vocabulary();}
                },
                minus: {
                    radicals: function(){ return data.apprentice.minus.radicals() + data.guru.radicals(); },
                    kanji: function(){ return data.apprentice.minus.kanji() + data.guru.kanji(); },
                    vocabulary: function(){ return data.apprentice.minus.vocabulary() + data.guru.vocabulary(); },
                    kana_vocabulary: function(){ return data.apprentice.minus.kana_vocabulary() + data.guru.kana_vocabulary(); },
                    total: function(){return data.guru.minus.radicals() + data.guru.minus.kanji() + data.guru.minus.vocabulary() + data.guru.minus.kana_vocabulary();}
                }
            },
            master: {
                radicals: function(){return count("7","radical");},
                kanji: function(){return count("7","kanji");},
                vocabulary: function(){return count("7","vocabulary");},
                kana_vocabulary: function(){return count("7","kana_vocabulary");},
                total: function(){return data.master.radicals() + data.master.kanji() + data.master.vocabulary() + data.master.kana_vocabulary();},
                plus: {
                    radicals: function(){ return data.master.radicals() + data.enlighten.plus.radicals(); },
                    kanji: function(){ return data.master.kanji() + data.enlighten.plus.kanji(); },
                    vocabulary: function(){ return data.master.vocabulary() + data.enlighten.plus.vocabulary(); },
                    kana_vocabulary: function(){ return data.master.kana_vocabulary() + data.enlighten.plus.kana_vocabulary(); },
                    total: function(){return data.master.plus.radicals() + data.master.plus.kanji() + data.master.plus.vocabulary() + data.master.plus.kana_vocabulary();}
                },
                minus: {
                    radicals: function(){ return data.guru.minus.radicals() + data.master.radicals(); },
                    kanji: function(){ return data.guru.minus.kanji() + data.master.kanji(); },
                    vocabulary: function(){ return data.guru.minus.vocabulary() + data.master.vocabulary(); },
                    kana_vocabulary: function(){ return data.guru.minus.kana_vocabulary() + data.master.kana_vocabulary(); },
                    total: function(){return data.master.minus.radicals() + data.master.minus.kanji() + data.master.minus.vocabulary() + data.master.minus.kana_vocabulary();}
                }
            },
            enlighten: {
                radicals: function(){return count("8","radical");},
                kanji: function(){return count("8","kanji");},
                vocabulary: function(){return count("8","vocabulary");},
                kana_vocabulary: function(){return count("8","kana_vocabulary");},
                total: function(){return data.enlighten.radicals() + data.enlighten.kanji() + data.enlighten.vocabulary() + data.enlighten.kana_vocabulary();},
                plus: {
                    radicals: function(){ return data.enlighten.radicals() + data.burned.plus.radicals(); },
                    kanji: function(){ return data.enlighten.kanji() + data.burned.plus.kanji(); },
                    vocabulary: function(){ return data.enlighten.vocabulary() + data.burned.plus.vocabulary(); },
                    kana_vocabulary: function(){ return data.enlighten.kana_vocabulary() + data.burned.plus.kana_vocabulary(); },
                    total: function(){return data.enlighten.plus.radicals() + data.enlighten.plus.kanji() + data.enlighten.plus.vocabulary() + data.enlighten.plus.kana_vocabulary();}
                },
                minus: {
                    radicals: function(){ return data.master.minus.radicals() + data.enlighten.radicals(); },
                    kanji: function(){ return data.master.minus.kanji() + data.enlighten.kanji(); },
                    vocabulary: function(){ return data.master.minus.vocabulary() + data.enlighten.vocabulary(); },
                    kana_vocabulary: function(){ return data.master.minus.kana_vocabulary() + data.enlighten.kana_vocabulary(); },
                    total: function(){return data.enlighten.minus.radicals() + data.enlighten.minus.kanji() + data.enlighten.minus.vocabulary() + data.enlighten.minus.kana_vocabulary();}
                }
            },
            burned: {
                radicals: function(){return count("9","radical");},
                kanji: function(){return count("9","kanji");},
                vocabulary: function(){return count("9","vocabulary");},
                kana_vocabulary: function(){return count("9","kana_vocabulary");},
                total: function(){return data.burned.radicals() + data.burned.kanji() + data.burned.vocabulary() + data.burned.kana_vocabulary();},
                plus: {
                    radicals: function(){ return data.burned.radicals(); },
                    kanji: function(){ return data.burned.kanji(); },
                    vocabulary: function(){ return data.burned.vocabulary(); },
                    kana_vocabulary: function(){ return data.burned.kana_vocabulary(); },
                    total: function(){return data.burned.plus.radicals() + data.burned.plus.kanji() + data.burned.plus.vocabulary() + data.burned.plus.kana_vocabulary();}
                },
                minus: {
                    radicals: function(){ return data.enlighten.minus.radicals() + data.burned.radicals(); },
                    kanji: function(){ return data.enlighten.minus.kanji() + data.burned.kanji(); },
                    vocabulary: function(){ return data.enlighten.minus.vocabulary() + data.burned.vocabulary(); },
                    kana_vocabulary: function(){ return data.enlighten.minus.kana_vocabulary() + data.burned.kana_vocabulary(); },
                    total: function(){return data.burned.minus.radicals() + data.burned.minus.kanji() + data.burned.minus.vocabulary() + data.burned.minus.kana_vocabulary();}
                }
            }
        };
        if(wkof.settings.srsGrid.includeLocked){
            $('.srs-progress #apprentice').before('<li id="locked" rel="popover-srs" title=""></li>');
            $('.srs-progress #locked').html("<span>Locked</span>").append(makeTable(data.locked));
        }
        if(wkof.settings.srsGrid.includeInitiate){
            $('.srs-progress #apprentice').before('<li id="initiate" rel="popover-srs" title=""></li>');
            $('.srs-progress #initiate').html("<span>Initiate</span>").append(makeTable(data.initiate));
        }


        $('.srs-progress #apprentice').html("<span>Apprentice</span>").append(makeTable(data.apprentice));
        $('.srs-progress #guru').html("<span>Guru</span>").append(makeTable(data.guru));
        $('.srs-progress #master').html("<span>Master</span>").append(makeTable(data.master));
        $('.srs-progress #enlightened').html("<span>Enlightened</span>").append(makeTable(data.enlighten));
        $('.srs-progress #burned').html("<span>Burned</span>").append(makeTable(data.burned));
        $('.dashboard section.srs-progress ul li').css('padding','10px 22.5px 10px');
        $('.orWorse').addClass('neverShow');
        $('.srs-progress li').addClass('plus');
        $('.srs-progress li').click(function(){changeHover();});
    }

    function properCase(word){
        return word.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    function changeHover(){
        if($('.srs-progress li table tr.neverShow').hasClass('orBetter')){
            $('.srs-progress li table tr.neverShow').removeClass('neverShow');
            $('.srs-progress li table tr.orWorse').addClass('neverShow');
            $('.srs-progress li').removeClass('minus').addClass('plus');
        } else {
            $('.srs-progress li table tr.neverShow').removeClass('neverShow');
            $('.srs-progress li table tr.orBetter').addClass('neverShow');
            $('.srs-progress li').removeClass('plus').addClass('minus');
        }
    }


    function addStyle(aCss) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (head) {
            style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.textContent = aCss;
            head.appendChild(style);
            return style;
        }
        return null;
    }

    function srsGridStyling(){
        addStyle('.progressDetailTable {' +
                 '  width: 100%;' +
                 '}' +
                 '.progressDetailTable td {' +
                 '  color: white;' +
                 '}' +
                 '.popover.srs {' +
                 ' display: none !important;' +
                 '}' +
                 '.progressDetailTableTDFirst {' +
                 ' text-align: ' + wkof.settings.srsGrid.gridMode.split("/")[0] +';' +
                 ' padding-right: 10px;' +
                 '}' +
                 '.progressDetailTableTDSecond {' +
                 ' text-align: ' + wkof.settings.srsGrid.gridMode.split("/")[1] +';' +
                 ' white-space: nowrap;' +
                 '}' +
                 '.progressDetailTableTDFirst, .progressDetailTableTDSecond {' +
                 ' color: white;' +
                 ' text-shadow: 2px 2px 3px #000000;' +
                 '}' +
                 '#txtApiKey {' +
                 ' width: 275px;' +
                 '}' +
                 '.srs-progress li table {' +
                 ' display: inline;' +
                 '}' +
                 '#divSRSGridLink.error {' +
                 '  background-color: red;' +
                 '}' +
                 '.dashboard section.srs-progress.noClean td {' +
                 '  font-size: 15px;' +
                 '}' +
                 '.dashboard section.srs-progress.noClean ul li {' +
                 '  display: table-cell !important;' +
                 '  padding: 10px 0px !important;' +
                 '  width: 500px;'+
                 '}' +
                 '.dashboard section.srs-progress.noClean ul li span {' +
                 '  margin-bottom: 10px !important;' +
                 '}' +
                 '.dashboard section.srs-progress ul li:first-child {' +
                 '  border-radius: 5px 0px 0px 5px !important;' +
                 '}' +
                 '.dashboard section.srs-progress ul li:last-child {' +
                 '  border-radius: 0px 5px 5px 0px !important;' +
                 '}' +
                 '.srs-progress li table tr.orBetter, .srs-progress li table tr.orWorse {' +
                 '  display: none;'+
                 '}' +
                 '.srs-progress li:hover table tr.orBetter, .srs-progress li:hover table tr.orWorse {' +
                 ' display: table-row;'+
                 ' font-style: italic;' +
                 '}' +
                 '.srs-progress #apprentice.minus:hover table tr.orWorse, .srs-progress #burned.plus:hover table tr.orBetter, .srs-progress #initiate.plus:hover table tr.orBetter, .srs-progress #initiate.minus:hover table tr.orWorse, .srs-progress #locked.plus:hover table tr.orBetter, .srs-progress #locked.minus:hover table tr.orWorse{' +
                 'font-style: normal !important; '+
                 '}' +
                 '.srs-progress li:hover table tr:not(.orBetter):not(.orWorse) {' +
                 '  display: none;'+
                 '}' +
                 '.srs-progress #apprentice.plus:hover span:after, .srs-progress #guru.plus:hover span:after, .srs-progress #master.plus:hover span:after, .srs-progress #enlightened.plus:hover span:after {' +
                 ' content: "+";' +
                 ' font-style: italic;' +
                 '}' +
                 '.srs-progress #guru.minus:hover span:after, .srs-progress #master.minus:hover span:after, .srs-progress #enlightened.minus:hover span:after, .srs-progress #burned.minus:hover span:after {' +
                 ' content: "-";' +
                 ' font-style: italic;' +
                 '}' +
                 '.srs-progress #apprentice.plus:hover span, .srs-progress #guru.plus:hover span, .srs-progress #master.plus:hover span, .srs-progress #enlightened.plus:hover span,' +
                 '.srs-progress #guru.minus:hover span, .srs-progress #master.minus:hover span, .srs-progress #enlightened.minus:hover span, .srs-progress #burned.minus:hover span{' +
                 ' font-style: italic;' +
                 '}' +
                 '.srs-progress li table tr.neverShow {' +
                 ' display:none !important;' +
                 '}');
        if(wkof.settings.srsGrid.includeInitiate || wkof.settings.srsGrid.includeLocked){
            addStyle(//'@media only screen and (min-width: 50vw) {' +
                     //'  .srs-progress ul {' +
                     //'    width: ' + ((234 * (wkof.settings.srsGrid.includeInitiate && wkof.settings.srsGrid.includeLocked ? 7 : 6)) + 52) + 'px !important;' +
                     //'    margin-left: -' + ((234 * (wkof.settings.srsGrid.includeInitiate && wkof.settings.srsGrid.includeLocked ? 2 : 1) + 52) / 2) + 'px !important;' +
                     //'  }' +
                     '  .srs-progress {' +
                     '    width: 100vw;' +
                     '    margin-left: -' + $('.dashboard .container').css('margin-left') + ';' +
                     '    text-align: center;' +
                     '  }' +
                     //'}' +
                     '.srs-progress ul #enlightened{' +
                     '  background-color: #0093dd;' +
                     '  background-repeat: repeat-x;' +
                     '  background-image: -moz-linear-gradient(-45deg, #0af, #0093dd);' +
                     '  background-image: -webkit-linear-gradient(-45deg, #0af, #0093dd);' +
                     '  background-image: -o-linear-gradient(-45deg, #0af, #0093dd);' +
                     '  background-image: linear-gradient(-45deg, #0af, #0093dd);' +
                     '}' +
                     '.srs-progress ul #master{' +
                     '  background-color: #294ddb;' +
                     '  background-repeat: repeat-x;' +
                     '  background-image: -moz-linear-gradient(-45deg, #5571e2, #294ddb);' +
                     '  background-image: -webkit-linear-gradient(-45deg, #5571e2, #294ddb);' +
                     '  background-image: -o-linear-gradient(-45deg, #5571e2, #294ddb);' +
                     '  background-image: linear-gradient(-45deg, #5571e2, #294ddb);' +
                     '}' +
                     '.srs-progress ul #guru{' +
                     '  background-color: #882d9e;' +
                     '  background-repeat: repeat-x;' +
                     '  background-image: -moz-linear-gradient(-45deg, #aa38c6, #882d9e);' +
                     '  background-image: -webkit-linear-gradient(-45deg, #aa38c6, #882d9e);' +
                     '  background-image: -o-linear-gradient(-45deg, #aa38c6, #882d9e);' +
                     '  background-image: linear-gradient(-45deg, #aa38c6, #882d9e);' +
                     '}' +
                     '.srs-progress ul #apprentice{' +
                     '  background-color: #dd0093;' +
                     '  background-repeat: repeat-x;' +
                     '  background-image: -moz-linear-gradient(-45deg, #f0a, #dd0093);' +
                     '  background-image: -webkit-linear-gradient(-45deg, #f0a, #dd0093);' +
                     '  background-image: -o-linear-gradient(-45deg, #f0a, #dd0093);' +
                     '  background-image: linear-gradient(-45deg, #f0a, #dd0093);' +
                     '}' +
                     '.srs-progress ul #locked{' +
                     '  background-color: #d5d5d5;' +
                     '  background-repeat: repeat-x;' +
                     '  background-image: -moz-linear-gradient(-45deg, #77c4c7, #77c4c7);' +
                     '  background-image: -webkit-linear-gradient(-45deg, #77c4c7, #77c4c7);' +
                     '  background-image: -o-linear-gradient(-45deg, #77c4c7, #77c4c7);' +
                     '  background-image: linear-gradient(-45deg, #77c4c7, #77c4c7);' +
                     '}' +
                     '.srs-progress ul #initiate{' +
                     '  background-color: #d5d5d5;' +
                     '  background-repeat: repeat-x;' +
                     '  background-image: -moz-linear-gradient(-45deg, #f73ee1, #f73ee1);' +
                     '  background-image: -webkit-linear-gradient(-45deg, #f73ee1, #f73ee1);' +
                     '  background-image: -o-linear-gradient(-45deg, #f73ee1, #f73ee1);' +
                     '  background-image: linear-gradient(-45deg, #f73ee1, #f73ee1);' +
                     '}' +
                    '.srs-progress ul li {' +
                    '  width: 234px !important; ' +
                    '}');
        }
        killClean();
    }

})(window.wk_srs_grid);