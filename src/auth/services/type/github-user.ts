export interface GithubUserType {
  /**
   * 깃허브 고유 아이디
   */
  login: string;
  /**
   * 깃허브 고유 숫자 아이디
   */
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
  name: string;
  company: any;
  blog: string;
  location: string;
  email: string | null;
  hireable: string;
  bio: string;
  twitter_username: string;
  notification_email: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}
