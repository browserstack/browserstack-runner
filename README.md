A command line interface to run browser tests over BrowserStack.

## Install
Go to the `browserstack-runner` directory.  
Install browserstack-runner

```
npm -g install
``
or


For development,
```
npm link
```


## Configuration
To run browser tests on BrowserStack infrastructure, copy
`browserstack.sample.json` to your repository as `browserstack.json`
and modify the parameters based on your requirements.


## Running tests
Run `browserstack-runner` to run the tests on all the browsers mentioned
in the configuration.
