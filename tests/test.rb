require 'rubygems'

RUNNER_DIR = Dir.pwd.gsub(/\/tests$/,"") + "/"
def execute(cmd)
  `#{cmd}`
end

def runBg(cmd, linestomatch, genre, test_strings)
  pid = Process.fork {
    counter = 0
    matched_counter = 0
    IO.popen(cmd) {|io|
      io.each {|line|
        if line.match(/Completed in /)
          counter += 1
          puts "[#{genre.upcase}] : " + line
          test_strings.each do |test_string|
            matched_counter += 1 if line.match(/#{test_string}/)
          end
        end
        if counter >= linestomatch
          if matched_counter != counter
            puts "\n####\n#{genre.upcase} FAILED\n####\n"
          end
          execute("ps -ef | grep #{io.pid} | grep -v grep | awk '{print $2}' | xargs kill -9")
        end
      }
    }
  }
  pid
end

class Test
  def run_project
  end
  
  def qunit
    repo_path = "#{RUNNER_DIR}tests/external-repos/"
    conf_path = "#{RUNNER_DIR}tests/conf/"
    execute("cd #{repo_path}underscorejs && npm install")
    execute("cd #{repo_path}underscorejs && cp #{conf_path}underscorejs.json #{repo_path}underscorejs/browserstack.json")
    pid = runBg("cd #{repo_path}underscorejs && ../../../bin/cli.js", 1, "qunit-underscorejs", ["631 of 631 passed"])
    execute("open http://localhost:8888/test/index.html")
    Process.wait(pid)
    sleep(1)

    execute("cd #{repo_path}Modernizr && npm install")
    execute("cd #{repo_path}Modernizr && cp #{conf_path}Modernizr.json #{repo_path}Modernizr/browserstack.json")
    pid2 = runBg("cd #{repo_path}Modernizr && ../../../bin/cli.js", 1, "qunit-Modernizr", ["20 of 41 passed"])
    execute("open http://localhost:8888/test/index.html")
    Process.wait(pid2)

    # https://github.com/bitovi/funcunit/
    # https://github.com/twbs/bootstrap
  end

  def mocha
    repo_path = "#{RUNNER_DIR}tests/external-repos/"
    conf_path = "#{RUNNER_DIR}tests/conf/"
    
    execute("cd #{repo_path}url.js && npm install")
    execute("cd #{repo_path}url.js && cp #{conf_path}url.js.json #{repo_path}url.js/browserstack.json")
    pid = runBg("cd #{repo_path}url.js && ../../../bin/cli.js", 1, "mocha-urlJs", ["35 of 35 passed"])
    execute("open http://localhost:8888/test.html")
    Process.wait(pid)
    sleep(1)
    
    # https://github.com/browserstack/microjungle
    # https://github.com/dhimil/mocha
    # https://github.com/auth0/auth0.js
  end

  def jasmine
    repo_path = "#{RUNNER_DIR}tests/external-repos/"
    conf_path = "#{RUNNER_DIR}tests/conf/"
    
    execute("cd #{repo_path}mout && npm install")
    execute("cd #{repo_path}mout && cp #{conf_path}mout.json #{repo_path}mout/browserstack.json")
    pid = runBg("cd #{repo_path}mout && ../../../bin/cli.js", 1, "jasmine-mout", ["978 of 978 passed"])
    execute("open http://localhost:8888/tests/runner.html")
    Process.wait(pid)
    sleep(1)
  end

  def run
    execute("cd #{RUNNER_DIR} && git submodule init && git submodule update")
    qunit
    mocha
    jasmine
  end
end

Test.new.run
