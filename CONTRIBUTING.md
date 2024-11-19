## Contributing

[fork]: https://github.com/advanced-security/codeql-sap-js/fork
[pr]: https://github.com/advanced-security/codeql-sap-js/compare
[style]: https://github.com/github/codeql/blob/main/docs/ql-style-guide.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Contributions to this project are [released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license) to the public under the [project's open source license](LICENSE.txt).

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Submitting a pull request

1. [Fork][fork] and clone the repository
1. Configure and install the [CodeQL CLI](https://github.com/github/codeql-cli-binaries/releases) specified in the `qlt.conf.json` file
1. Create a new branch: `git checkout -b my-branch-name`
1. Make your changes
1. Make sure the QL tests pass on your machine
1. Ensure the files are appropriately formatted (QL files should be formatted with `codeql query format`)
1. Push to your fork and [submit a draft pull request](https://github.com/advanced-security/codeql-sap-js/compare). Make sure to select **Create Draft Pull Request**.
7. Address failed checks, if any.
8. Mark the [pull request ready for review](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/changing-the-stage-of-a-pull-request#marking-a-pull-request-as-ready-for-review).
9. Pat your self on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Follow the [CodeQL style guide][style].
- Write good tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
