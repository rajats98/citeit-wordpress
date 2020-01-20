/*
 * Quote-Context JS Library
 * https://github.com/CiteIt/citeit-jquery
 *
 * Copyright 2015-2019, Tim Langeman
 * http://www.openpolitics.com/tim
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 *
 * This is a jQuery function that locates all "blockquote" and "q" tags
 * within an html document and calls the CiteIt.net web service to
 * locate contextual info about the requested quote.
 *
 * The CiteIt.net web service returns a json dictionary and this script
 * injects the returned contextual data into hidden html elements to be
 * displayed when the user hovers over or clicks on the cited quote.
 *
 * Demo: http://www.CiteIt.net
 *
 * Dependencies:
 *  - jQuery: https://jquery.com/
 *  - Sha256: https://github.com/brillout/forge-sha256/
 *  - jsVideoUrlParser: https://www.npmjs.com/package/js-video-url-parser
 *
*/

popup_library = "jQuery";

// div in footer than holds injected json data, requires css class to hide
hidden_container = "neotext_container";
jQuery.curCSS = "jQuery.css";
version_num = "0.3";

// Remove anchor from URL
current_page_url = window.location.href.split("#")[0];

jQuery.fn.quoteContext = function() {
  // Add "before" and "after" sections to quote excerpts
  // Designed to work for "blockquote" and "q" tags

  //Setup hidden div to store all quote metadata
  jQuery(this).each(function(){
    // Loop through all the submitted tags (blockquote or q tags) to
    // see if any have a "cite" attribute
    if( jQuery(this).attr("cite") ){
      var blockcite = jQuery(this);
      var cited_url = blockcite.attr("cite");
      var citing_url = current_page_url;
      var citing_quote = blockcite.text();
      var embed_icon = "";
      var embed_html = "";

      // Test the URL to see if it is one of the Supported Media Providers:
      var media_providers = ["youtube","vimeo","soundcloud"];
      var url_provider = "";
      console.log("cited_url: " + cited_url);

      var url_parsed = urlParser.parse(cited_url);
      if (!(typeof url_parsed === 'undefined')) {
        if (url_parsed.hasOwnProperty("provider")){
          url_provider = url_parsed.provider;
        }
      }
      if (url_provider == "youtube"){
        // Create Canonical Embed URL:
        embed_url = "https://youtube.com/embed/" + url_parsed.id;
        embed_icon = "<span class='view_on_youtube'>" +
                     "Expand: Show Video Clip</span>";
        embed_html = "<iframe class='youtube' src='" + embed_url +
                         "' width='560' height='315' " +
                         "frameborder='0' allowfullscreen='allowfullscreen'>" +
                     "</iframe>";
      }
      else if (url_provider == "vimeo") {
        // Create Canonical Embed URL:
        embed_url = "https://player.vimeo.com/video/" + url_parsed.id;
        embed_icon = "<span class='view_on_youtube'>" +
                         "Expand: Show Video Clip</span>";
        embed_html = "<iframe class='youtube' src='" + embed_url +
                         "' width='640' height='360' " +
                         "frameborder='0' allowfullscreen='allowfullscreen'>" +
                     "</iframe>";
      }
      else if (url_provider == "soundcloud") {
        // Webservice Query: Get Embed Code
        $.getJSON('http://soundcloud.com/oembed?callback=?',
        { format: 'js', 
          url: cited_url, 
          iframe: true
        },
        function(data) {
           embed_html = data['html'];
        });

        embed_icon = "<span class='view_on_youtube'>" +
                         "Expand: Show SoundCloud Clip</span>";

      }
      // If they have a cite tag, check to see if its hash is already saved
      if (cited_url.length > 3){
        var tag_type = jQuery(this)[0].tagName.toLowerCase();
        var url_quote_text = escape_quote(citing_quote) + "|" +
                             escape_url(citing_url) + "|" +
                             escape_url(cited_url);
        console.log(url_quote_text);
        var quote_hash_value = forge_sha256(url_quote_text);
        var shard = quote_hash_value.substring(0,2);
        var read_base = "https://read.citeit.net/quote/";
        var read_url = read_base.concat("sha256/", version_num, "/",
                          shard, "/", quote_hash_value, ".json");
        var json = null;

        //See if a json summary of this quote was already created
        // and uploaded to the content delivery network
          jQuery.ajax({
              type: "GET",
          url: read_url,
              dataType: "json",
              success: function(json) {
                  add_quote_to_dom(tag_type, json );
            console.log("CiteIt Found: " + read_url);
            console.log("       Quote: " + citing_quote);
              },
              error: function() {
            console.log("CiteIt Missed: " + read_url);
            console.log("       Quote: " + citing_quote);
              }
          });

        function add_quote_to_dom(tag_type, json ) {
          if ( tag_type == "q"){
            var q_id = "hidden_" + json.sha256;

            //Add content to a hidden div, so that the popup can later grab it
            jQuery("#" + hidden_container).append(
              "<div id='" + q_id + "' class='highslide-maincontent'>.. " +
                json.cited_context_before + " " + " <strong>" +
                json.citing_quote + "</strong> " +
                json.cited_context_after + ".. </p>" +
                "<p><a href='" + json.cited_url +
                "' target='_blank'>Read more</a> | " +
                "<a href='javascript:close_popup(" +
                q_id + ");'>Close</a> </p></div>");

            //Style quote as a link that calls the popup expander:
            blockcite.wrapInner("<a href='" + blockcite.attr("cite") + "' " +
              "onclick='return expand_popup(this ,\"" + q_id +"\")' " +
             " />");
          }
          else if (tag_type == "blockquote"){

            //Fill "before" and "after" divs and then quickly hide them
            blockcite.before("<div id='quote_before_" + json.sha256 +
              "' class='quote_context'>" +
              "<blockquote class='quote_context'>" +
                  embed_html + "</a><br />.. " +
                  json.cited_context_before +
              " .. </blockquote></div>");

            blockcite.after("<div id='quote_after_" + json.sha256 +
              "' class='quote_context'>" +
              "<blockquote class='quote_context'>" +
                json.cited_context_after + " ..</blockquote></div>" +
              "<div class='neotext_source'>" +
              "<span class='neotext_source_label'>source: </span> " +
                "<a class='neotext_source_domain' href='" + json.cited_url +
                "'>" + extractDomain( json.cited_url ) +
              "</a></div>"
            );

            var context_before = jQuery("#quote_before_" + json.sha256);
            var context_after = jQuery("#quote_after_" + json.sha256);

            context_before.hide();
            context_after.hide();

            //Display arrows if content is found
            if( json.cited_context_before.length > 0){
            context_before.before("<div class='quote_arrows context_up' "+
              "id='context_up_" + json.sha256 + "'> " +
              "<div id='up_wrap_" + json.sha256 + "'><a href=\"javascript:toggle_quote('before', 'quote_before_" +
              json.sha256 + "','up');\">&#9650;</a></div>" +
              "<a href=\"javascript:toggle_quote('before', 'quote_before_" +
              json.sha256 + "');\">" +
              embed_icon + "</a></div>");
            }

            if( json.cited_context_after.length > 0){
            context_after.after("<div class='quote_arrows context_down' "+
              "id='context_down_" + json.sha256 +"'> " +
              "<div id='down_wrap_" + json.sha256 + "','down'><a href=\"javascript:toggle_quote('after', 'quote_after_" +
              json.sha256 +"','down');\">&#9660;</a></div></div>"
            );
            }
          }
        }

      } // if url.length is not blank
    }  // if "this" has a "cite" attribute
  });     //   jQuery(this).each(function() { : blockquote, or q tag

};

function toggle_quote(section, id, position){
  jQuery("#" + id).fadeToggle();

  //rotate icons on click
  let sha = id.split('_')[2];
  let parent_div_id = `${position}_warp_${sha}`;
  jQuery(`#${parent_div_id}`).toggleClass('rotated180');
}

function expand_popup(tag, hidden_popup_id){
  if (popup_library == "highslide"){
  return hs.htmlExpand(tag, {maincontentId: hidden_popup_id });
  }
  else {
  jQuery.curCSS = jQuery.css;

  // Setup Initial Dialog box
  jQuery("#" + hidden_popup_id).dialog({
    autoOpen: false,
    closeOnEscape: true,
    closeText: "hide",
    draggableType: true,
    resizable: true,
    width: 400,
    modal: false,
    title: "powered by CiteIt.net",
    hide: { effect: "size", duration: 400 },
    show: { effect: "scale", duration: 400 },
    });

  // Add centering and other settings
  jQuery("#" + hidden_popup_id).dialog("option",
    "position", { at: "center center", of: tag}
    ).dialog("option", "hide", { effect: "size", duration: 400 }
    ).dialog("option", "show", { effect: "scale", duration: 400 }
    ).dialog( {"title" : "powered by CiteIt.net"}
    ).dialog("open"
    ).blur(
  );

  // Close popup when you click outside of it
  jQuery(document).mouseup(function(e) {
    var popupbox = jQuery(".ui-widget-overlay");
    if (popupbox.has(e.target).length === 0){
       //$("#" + hidden_popup_id).dialog("close");
    }
  });

  return false; // Don't follow link
  }
}

function close_popup(hidden_popup_id){
  // assumes jQuery library
  jQuery(hidden_popup_id).dialog("close");
}

//Source: http://stackoverflow.com/questions/10032024/how-to-remove-leading-and-trailing-white-spaces-from-a-given-html-string
// Credit:  KhanSharp:  (used for backward compatibility.
//          trim() introduced in javascript 1.8.1)

function trim_regex(str){
  return str.replace(/^[ ]+|[ ]+$/g,"")
}

function escape_url(str){
  var replace_chars_array = [
    "\n", " ", "&nbsp",
  ];
  str = trim_regex(str);   // remove whitespace at beginning and end

  return normalize_text(str, replace_chars_array);

}

function escape_quote(str){
  var replace_chars_array = [" ", "\n", "â€™", ",", ".", "-", "–", "-"
            , "-", "—", ":", "/", "!", "`", "~", "^", "’"
            , "&nbsp", "\xa0", "&#8217;"
            , "&#169;", "&copy;", "&#174;"
            , "&reg;", "&#8364;", "&euro;", "&#8482;", "&trade;"
            , "&lsquo;", "&rsquo;", "&sbquo;", "&ldquo;", "&rdquo;", "&bdquo;"
            , "&#34;", "&quot;", "&#38;", "&amp;", "&#39;", "&#163;", "&pound;"
            , "&#165;", "&yen;", "&#168;", "&uml;", "&die;", "&#169;", "&copy;"
            , "\u201c", "“", "”", "‘", "’", "’",
            , "&#8217;", "&#8230;",
        ];

  return normalize_text(str, replace_chars_array);
}

// Credit: Sean Bright, MC Emperor
// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
function escapeRegExp(str) {
  if (typeof str != "undefined"){
      return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  }
  else {
    return "";
  }
}
function replace_all(str, find, replace) {
  if (typeof str != "undefined"){
    return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
  }
  else {
    return "";
  }
}
function normalize_text(str, replace_chars_array){
  /*  This javascript function performs the same functionality as the
    python method: neotext_quote_context.utility.text.normalize()

    It replaces an array of symbols found within the input string
    with the specified replacement character(s).
    By default, the replacement_char is an empty string, meaning this function
    removes all of replace_chars from the text.
 */

  // Default to empty string
  replacement_char = "";

  // If no array passed, set default
  if (!(typeof replace_chars_array !== "undefined" &&
      replace_chars_array.length > 0)
  ){
  var replace_chars_array = ["\n", "’", ",", "." , "-", ":", "/", "!"
    , String.fromCharCode(34), String.fromCharCode(39), ";",
    , "`", "~", "^", " ", "&nbsp", "\xa0", "&#8217;"
    , "&#169;", "&copy;", "&#174;"
    , "&reg;", "&#8364;", "&euro;", "&#8482;", "&trade;"
    , "&lsquo;", "&rsquo;", "&sbquo;", "&ldquo;", "&rdquo;", "&bdquo;"
    , "&#34;", "&quot;", "&#38;", "&amp;", "&#39;", "&#163;", "&pound;"
    , "&#165;", "&yen;", "&#168;", "&uml;", "&die;", "&#169;", "&copy;"
    ];
  }

  // loop through replace_chars with "old school" loop,
  // for maximum browser compatibility
  var index;
  for (index = 0; index < replace_chars_array.length; ++index) {
  str = replace_all(str, replace_chars_array[index], replacement_char); 
  }
  return str;
}
function quote_hash(citing_quote, citing_url, cited_url){
  var url_quote_text = escape_quote(citing_quote) + "|" +
                       escape_url(citing_url) + "|" +
                       escape_url(cited_url);
  return forge_sha256(url_quote_text);
}
function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split("/")[2];
    }
    else {
        domain = url.split("/")[0];
    }

    //find & remove port number
    domain = domain.split(":")[0];
    return domain;
}