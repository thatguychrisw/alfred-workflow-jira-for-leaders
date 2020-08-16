import JiraApi from 'jira-client'
import alfy from 'alfy'
import { getEnv, replaceAlfredVars } from '../helpers'

export default ((host, username, password) => {
    /**
     * @property api.findIssue
     * @property api.searchJira
     * @property api.searchUsers
     */
    const api = new JiraApi({
        protocol: 'https',
        host,
        username,
        password,
        apiVersion: '2',
        strictSSL: true
    })

    const getIssueById = async (id, fields) => {
        try {
            const issue = await api.findIssue(id, '', fields && fields.join(','))

            const title = issue.fields.summary.replace(/"/g, '')
            const url = `https://${host}/browse/${id}`

            let mapped = {title, url}

            const additionalFields = fields.filter(field => !['summary', 'key'].includes(field))
            if (additionalFields) {
                additionalFields.forEach(field => mapped[field] = issue.fields[field])
            }

            return mapped
        } catch (e) {
            console.error(e.message)

            return false
        }
    }

    const getIssues = async (criteria, fields) => {
        try {
            const results = await api.searchJira(replaceAlfredVars(criteria), {fields})

            const issues = results.issues.map((issue) => {
                const title = issue.fields.summary.replace(/"/g, '')
                const url = `https://${host}/browse/${issue.key}`

                let mapped = {title, url}

                const additionalFields = fields.filter(field => !['summary', 'key'].includes(field))
                if (additionalFields) {
                    additionalFields.forEach(field => mapped[field] = issue.fields[field])
                }

                return mapped
            })

            return issues
        } catch (e) {
            console.error(e.message)

            return false
        }
    }

    const getUserAccountIds = async (emailAddresses) => {
        try {
            let userAccounts = {}

            /**
             * Check for cached user account ids
             * @todo refactor this to make one call to the cache
             */
            emailAddresses.forEach((emailAddress) => {
                const accountId = alfy.cache.get(emailAddress)

                if (accountId) {
                    userAccounts[emailAddress] = accountId
                }
            })

            /**
             * For non-cached user account ids fetch from Jira
             */
            const nonCachedUserAccounts = emailAddresses.filter(emailAddress => !userAccounts.hasOwnProperty(emailAddress))
            if (nonCachedUserAccounts) {
                const results = await api.searchUsers({query: nonCachedUserAccounts.join(',')})

                const foundUsers = results.filter(({emailAddress}) => nonCachedUserAccounts.includes(emailAddress))

                if (foundUsers) {
                    foundUsers.forEach(({emailAddress, accountId}) => {
                        alfy.cache.set(emailAddress, accountId)

                        userAccounts[emailAddress] = accountId
                    })
                }
            }

            return userAccounts
        } catch (e) {
            console.error(e.message)

            return false
        }
    }

    return {
        getIssueById,
        getIssues,
        getUserAccountIds,
    }
})
