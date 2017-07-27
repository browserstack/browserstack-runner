(function(){
  function countSpecs(suite, results){
    for (var i = 0; i < suite.specs.length; ++i) {
      if (suite.specs[i].passed){
        results.passed++;
      }
      else if(suite.specs[i].results.skipped) {
        results.skipped++;
      } else {
        results.failed++;
      }
    }

    for (var i = 0; i < suite.suites.length; ++i) {
      if (suite.suites[i]) {
        results = countSpecs(suite.suites[i], results);
      }
    }

    return results;
  }

  var checker = setInterval(function() {
    if (!jasmine.running) {
      var results = {};
      var report = jasmine.getJSReport();
      results.runtime = report.durationSec * 1000;
      results.total = 0;
      results.passed = 0;
      results.failed = 0;
      results.skipped = 0;

      for (var i = 0; i < report.suites.length; ++i) {
        if (report.suites[i]) {
          results = countSpecs(report.suites[i], results);
        }
      }

      results.total = results.passed + results.failed + results.skipped;

      results.url = window.location.pathname;
      results.report = report
      BrowserStack.post("/_report", results, function(){});
      clearInterval(checker);
    }
  }, 1000);
})();

