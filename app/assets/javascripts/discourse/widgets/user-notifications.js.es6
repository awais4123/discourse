import RawHtml from 'discourse/widgets/raw-html';

import { createWidget } from 'discourse/widgets/widget';
import { headerHeight } from 'discourse/components/site-header';
import { h } from 'virtual-dom';

const LIKED_TYPE = 5;
const INVITED_TYPE = 8;
const GROUP_SUMMARY_TYPE = 16;

createWidget('notification-item', {
  tagName: 'li',

  buildClasses(attrs) {
    const classNames = [];
    if (attrs.read) { classNames.push('read'); }
    if (attrs.is_warning) { classNames.push('is-warning'); }
    return classNames;
  },

  url() {
    const attrs = this.attrs;
    const data = attrs.data;

    const badgeId = data.badge_id;
    if (badgeId) {
      let badgeSlug = data.badge_slug;

      if (!badgeSlug) {
        const badgeName = data.badge_name;
        badgeSlug = badgeName.replace(/[^A-Za-z0-9_]+/g, '-').toLowerCase();
      }

      let username = data.username;
      username = username ? "?username=" + username.toLowerCase() : "";
      return Discourse.getURL('/badges/' + badgeId + '/' + badgeSlug + username);
    }

    const topicId = attrs.topic_id;
    if (topicId) {
      return Discourse.Utilities.postUrl(attrs.slug, topicId, attrs.post_number);
    }

    if (attrs.notification_type === INVITED_TYPE) {
      return Discourse.getURL('/users/' + data.display_username);
    }

    if (data.group_id) {
      return Discourse.getURL('/users/' + data.username + '/messages/group/' + data.group_name);
    }
  },

  description() {
    const data = this.attrs.data;
    const badgeName = data.badge_name;
    if (badgeName) { return Discourse.Utilities.escapeExpression(badgeName); }

    const title = data.topic_title;
    return Ember.isEmpty(title) ? "" : Discourse.Utilities.escapeExpression(title);
  },

  text() {
    const attrs = this.attrs;
    const data = attrs.data;

    const notificationType = attrs.notification_type;

    const lookup = this.site.get('notificationLookup');
    const notName = lookup[notificationType];
    const scope = (notName === 'custom') ? data.message : `notifications.${notName}`;

    if (notificationType === GROUP_SUMMARY_TYPE) {
      const count = data.inbox_count;
      const group_name = data.group_name;
      return I18n.t(scope, { count, group_name });
    }

    const username = data.display_username;
    const description = this.description();
    if (notificationType === LIKED_TYPE && data.count > 1) {
      const count = data.count - 2;
      const username2 = data.username2;
      if (count===0) {
        return I18n.t('notifications.liked_2', {description, username, username2});
      } else {
        return I18n.t('notifications.liked_many', {description, username, username2, count});
      }
    }

    return I18n.t(scope, {description, username});
  },

  html() {
    const contents = new RawHtml({ html: `<div>${Discourse.Emoji.unescape(this.text())}</div>` });
    const url = this.url();
    return url ? h('a', { attributes: { href: url } }, contents) : contents;
  }
});

export default createWidget('user-notifications', {
  tagName: 'div.notifications',
  buildKey: () => 'user-notifications',

  defaultState() {
    return { notifications: [], loading: false };
  },

  refreshNotifications(state) {

    if (this.loading) { return; }

    // estimate (poorly) the amount of notifications to return
    let limit = Math.round(($(window).height() - headerHeight()) / 55);
    // we REALLY don't want to be asking for negative counts of notifications
    // less than 5 is also not that useful
    if (limit < 5) { limit = 5; }
    if (limit > 40) { limit = 40; }

    const stale = this.store.findStale('notification', {recent: true, limit }, {cacheKey: 'recent-notifications'});

    if (stale.hasResults) {
      const results = stale.results;
      let content = results.get('content');

      // we have to truncate to limit, otherwise we will render too much
      if (content && (content.length > limit)) {
        content = content.splice(0, limit);
        results.set('content', content);
        results.set('totalRows', limit);
      }

      state.notifications = results;
    } else {
      state.loading = true;
    }

    stale.refresh().then(notifications => {
      this.currentUser.set('unread_notifications', 0);
      state.notifications = notifications;
    }).catch(() => {
      state.notifications = [];
    }).finally(() => {
      state.loading = false;
      this.scheduleRerender();
    });
  },

  html(attrs, state) {
    if (!state.notifications.length) {
      this.refreshNotifications(state);
    }

    const result = [];
    if (state.loading) {
      result.push(h('div.spinner-container', h('div.spinner')));
    } else if (state.notifications.length) {

      const notificationItems = state.notifications.map(n => this.attach('notification-item', n));
      const href = `${attrs.path}/notifications`;

      result.push(h('hr'));
      result.push(h('ul', [
                    notificationItems,
                    h('li.read.last.heading',
                      h('a', { attributes: { href } }, [I18n.t('notifications.more'), '...'])
                    )
                  ]));

    }

    return result;
  }
});
