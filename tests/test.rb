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
  def run_project(reponame, test_framework, passed_array, browser_url)
    repo_path = "#{RUNNER_DIR}tests/external-repos/"
    conf_path = "#{RUNNER_DIR}tests/conf/"

    execute("cd #{repo_path}#{reponame} && npm install")
    execute("cd #{repo_path}#{reponame} && cp #{conf_path}#{reponame}.json #{repo_path}#{reponame}/browserstack.json")
    pid = runBg("cd #{repo_path}#{reponame} && ../../../bin/cli.js", 1, "#{test_framework}-#{reponame}", passed_array)
    execute("open http://localhost:8888/#{browser_url}")
    Process.wait(pid)
    sleep(1)
  end
  
  def qunit
    run_project("underscorejs", "qunit", ["631 of 631 passed"], "test/index.html")
    run_project("Modernizr", "qunit", ["20 of 41 passed"], "test/index.html")
    # https://github.com/bitovi/funcunit/
    # https://github.com/twbs/bootstrap
  end

  def mocha
    run_project("url.js", "mocha", ["35 of 35 passed"], "test.html")    
    # https://github.com/browserstack/microjungle
    # https://github.com/dhimil/mocha
    # https://github.com/auth0/auth0.js
  end

  def jasmine
    run_project("mout", "jasmine", ["978 of 978 passed"], "tests/runner.html")
  end

  def run
    execute("cd #{RUNNER_DIR} && git submodule init && git submodule update")
    qunit
    mocha
    jasmine
  end
end

Test.new.run
