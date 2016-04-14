export default Ember.Component.extend({

  _markRead: function(){
    this.$('a').click(() => {
      this.set('notification.read', true);
      Discourse.setTransientHeader("Discourse-Clear-Notifications", this.get('notification.id'));
      if (document && document.cookie) {
        document.cookie = `cn=${this.get('notification.id')}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
      }
      return true;
    });
  }.on('didInsertElement'),
});
