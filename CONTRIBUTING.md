## Contributing to browserstack-runner

Your help improving this project is welcome!

## Got a question or problem? Found an issue?

If you have questions about how to use this tool, or you found a bug in the source code or a mistake in the documentation, [file an issue](https://github.com/browserstack/browserstack-runner/issues/new).

## Want to contribute code?

If you found an issue and want to contribute a fix or implement a new feature, send a pull request!

To make changes: [Fork the repo, clone it locally](https://help.github.com/articles/fork-a-repo/), make a branch for your change, then implement it.

Install some dependencies:

    npm install

Then run tests with:

    npm test

This runs some unit tests (consider adding more to `tests/unit`) and runs some other tools like jshint. Make sure to fix lint issues it finds.

To test your change with another project where you use the tool, use `npm-link`:

    # in your browserstack-runner checkout
    npm link
    # in your project
    npm link browserstack-runner

Or do a local install:

    # in your project
    npm install /path/to/checkout/browserstack-runner

Once done, commit, push the branch to your repo and [create a pull request](https://help.github.com/articles/using-pull-requests/#initiating-the-pull-request).
