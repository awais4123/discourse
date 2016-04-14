import { observes } from 'ember-addons/ember-computed-decorators';

export default Ember.Component.extend({

  @observes('currentUser.lastNotificationChange')
  _resetCachedNotifications() {
    const visible = this.get('visible');

    if (!Discourse.get("hasFocus")) {
      this.set('visible', false);
      this.set('notifications', null);
      return;
    }

    if (visible) {
      this.refreshNotifications();
    } else {
      this.set('notifications', null);
    }
  }

});
