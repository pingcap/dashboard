// Consider this js file must run normally in the old browsers likes IE 6,
// so we can't use the new grammars and APIs (likes let/const, string interpolator, querySelector, etc) in this file.
// We need to handle the compatibility carefully.

function browserLang() {
  // https://zzz.buzz/2016/01/13/detect-browser-language-in-javascript/
  // https://social.msdn.microsoft.com/Forums/sqlserver/en-US/a3d78aaf-9f70-4826-954d-19183173c1c3/how-to-change-navigatoruserlanguage-in-ie11
  return (
    (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    navigator.browserLanguage ||
    navigator.userLanguage ||
    'en'
  )
}

function checkBrowser(supportedBrowsers) {
  if (supportedBrowsers.test(navigator.userAgent)) {
    var text
    if (browserLang().indexOf('zh') === 0) {
      text =
        '一些功能在此浏览器上可能无法工作，请使用最新版本的 Chrome/Edge/Firefox/Safari 浏览器。'
    } else {
      text =
        'Some features may not work in your browser. Please use latest Chrome/Edge/Firefox/Safari browsers.'
    }

    const content =
      '<div style="background: #fadb14; width: 100%; position: absolute; top: 0; z-index: 4; padding: 8px; text-align: center; transition: top 2s;">' +
      '<b>' +
      text +
      '<a><span>X</span></a></b><div>'

    var d = document.createElement('div')
    d.innerHTML = content
    d.getElementsByTagName('a')[0].onclick = function () {
      d.getElementsByTagName('div')[0].style.top = '-60px'
    }
    document.body.prepend(d)
  }
}

// This part code is auto generated by `yarn supportedBrowsers` command.
// Don't edit it and always keep it in the end of this file. It means don't add new content after it.
;checkBrowser(/((CPU[ +]OS|iPhone[ +]OS|CPU[ +]iPhone|CPU IPhone OS)[ +]+(9[_\.]3|9[_\.]([4-9]|\d{2,})|([1-9]\d|\d{3,})[_\.]\d+|11[_\.]3|11[_\.]([4-9]|\d{2,})|(1[2-9]|[2-9]\d|\d{3,})[_\.]\d+|12[_\.]0|12[_\.]([1-9]|\d{2,})|12[_\.]4|12[_\.]([5-9]|\d{2,})|(1[3-9]|[2-9]\d|\d{3,})[_\.]\d+|13[_\.]0|13[_\.]([1-9]|\d{2,})|13[_\.]3|13[_\.]([4-9]|\d{2,})|(1[4-9]|[2-9]\d|\d{3,})[_\.]\d+)(?:[_\.]\d+)?)|(CFNetwork\/8.* Darwin\/16\.5\.\d+)|(CFNetwork\/8.* Darwin\/16\.6\.\d+)|(CFNetwork\/8.* Darwin\/16\.7\.\d+)|(SamsungBrowser\/(10\.1|10\.([2-9]|\d{2,})|(1[1-9]|[2-9]\d|\d{3,})\.\d+))|(Edge\/(18(?:\.0)?|18(?:\.([1-9]|\d{2,}))?|(19|[2-9]\d|\d{3,})(?:\.\d+)?))|((Chromium|Chrome)\/(49\.0|49\.([1-9]|\d{2,})|([5-9]\d|\d{3,})\.\d+|79\.0|79\.([1-9]|\d{2,})|([8-9]\d|\d{3,})\.\d+)(?:\.\d+)?([\d.]+$|.*Safari\/(?![\d.]+ Edge\/[\d.]+$)))|(Version\/(12\.1|12\.([2-9]|\d{2,})|(1[3-9]|[2-9]\d|\d{3,})\.\d+|13\.0|13\.([1-9]|\d{2,})|(1[4-9]|[2-9]\d|\d{3,})\.\d+)(?:\.\d+)? Safari\/)|(Trident\/7\.0)|(Firefox\/(68\.0|68\.([1-9]|\d{2,})|(69|[7-9]\d|\d{3,})\.\d+|74\.0|74\.([1-9]|\d{2,})|(7[5-9]|[8-9]\d|\d{3,})\.\d+)\.\d+)|(Firefox\/(68\.0|68\.([1-9]|\d{2,})|(69|[7-9]\d|\d{3,})\.\d+|74\.0|74\.([1-9]|\d{2,})|(7[5-9]|[8-9]\d|\d{3,})\.\d+)(pre|[ab]\d+[a-z]*)?)|(([MS]?IE) (11\.0|11\.([1-9]|\d{2,})|(1[2-9]|[2-9]\d|\d{3,})\.\d+))/)
