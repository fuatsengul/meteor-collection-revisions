var Mongo, root;

root = typeof exports !== "undefined" && exports !== null ? exports : this;

root.CollectionRevisions = {};

CollectionRevisions.defaults = {
  field: 'revisions',
  lastModifiedField: 'lastModified',
  ignoreWithin: false,
  ignoreWithinUnit: 'minutes',
  keep: true,
  debug: false
};

if (typeof Mongo === "undefined") {
  Mongo = {};
  Mongo.Collection = Meteor.Collection;
}

Mongo.Collection.prototype.attachCollectionRevisions = function(opts) {
  var collection, crDebug, fields;
  if (opts == null) {
    opts = {};
  }
  collection = this;
  _.defaults(opts, CollectionRevisions.defaults);
  if (opts.keep === true) {
    opts.keep = -1;
  }
  if (opts.ignoreWithin === false) {
    opts.ignoreWithin = 0;
  }
  fields = {
    field: String,
    lastModifiedField: String,
    ignoreWithin: Number,
    ignoreWithinUnit: String,
    keep: Number,
    debug: Boolean
  };
  check(opts, Match.ObjectIncluding(fields));
  collection.before.insert(function(userId, doc) {
    crDebug(opts, 'Begin before.insert');
    return doc[opts.lastModifiedField] = new Date();
  });
  collection.before.update(function(userId, doc, fieldNames, modifier, options) {
    crDebug(opts, 'Begin before.update');
    crDebug(opts, opts, 'Defined options');
    options = options || {};
    if (options.multi) {
      crDebug(opts, "multi doc update attempted, can't create revisions this way, leaving.");
      return true;
    }
    modifier = modifier || {};
    modifier.$set = modifier.$set || {};
    modifier.$set[opts.lastModifiedField] = new Date();
    delete doc[opts.field];
    delete doc._id;
    doc.revisionId = Random.id();
    if (moment(doc[opts.lastModifiedField]).isBefore(moment().subtract(opts.ignoreWithin, opts.ignoreWithinUnit)) || opts.ignoreWithin === 0 || (doc[opts.lastModifiedField] == null)) {
      crDebug(opts, 'Is past ignore window, creating revision');
      modifier.$push = modifier.$push || {};
      modifier.$push[opts.field] = {
        $each: [doc],
        $position: 0
      };
      if (opts.keep > -1) {
        modifier.$push[opts.field].$slice = opts.keep;
      }
      crDebug(opts, modifier, 'Final Modifier');
    } else {
      crDebug(opts, "Didn't create a new revision");
    }
  });
  return crDebug = function(opts, item, label) {
    if (label == null) {
      label = '';
    }
    if (!opts.debug) {
      return;
    }
    if (typeof item === 'object') {
      console.log("collectionRevisions DEBUG: " + label + '↓');
      return console.log(item);
    } else {
      return console.log("collectionRevisions DEBUG: " + label + '= ' + item);
    }
  };
};
