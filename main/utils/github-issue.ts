import {shell} from 'electron';

type GitHubIssueOptions = {
  user?: string;
  repo?: string;
  repoUrl?: string;
  title?: string;
  body?: string;
  labels?: string[];
};

export const openGitHubIssue = ({user, repo, repoUrl, title, body, labels}: GitHubIssueOptions) => {
  const url = repoUrl ? new URL(repoUrl) : new URL(`https://github.com/${user}/${repo}`);
  url.hash = '';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/issues/new`;

  if (title) {
    url.searchParams.set('title', title);
  }

  if (body) {
    url.searchParams.set('body', body);
  }

  if (labels?.length) {
    url.searchParams.set('labels', labels.join(','));
  }

  return shell.openExternal(url.href);
};
