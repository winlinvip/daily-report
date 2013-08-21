/**
 * for example: http://your.redmone.com/issues
 * which can add bug id as: http://your.redmine.com/issues/100
 **/
function get_redmine_issue_url(){
    var o = window.location;
    return o.protocol + "//" + o.hostname + "/issues";
}
