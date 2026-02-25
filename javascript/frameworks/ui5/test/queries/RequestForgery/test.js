import request from 'request';
$(document).ready(function () {
    var request = new XMLHttpRequest();
    var url = jQuery.sap.GetUriParameters().get("url");
    request.open("GET", url, false);
});