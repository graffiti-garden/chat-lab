export default class UsernameResolver {

  constructor(graffiti, context=['designftw.mit.edu']) {
    this.gf = graffiti
    this.context = context
  }

  async usernameToActor(username, signal=AbortSignal.timeout(500)) {
    const offer = await this.#resolveOffer(object=> 
      object.object.preferredUsername == username, signal)
    return offer? offer.actor : null
  }

  async actorToUsername(actor, signal=AbortSignal.timeout(500)) {
    const offer = await this.#resolveOffer(object=> 
      object.actor == actor &&
      object.object.actor == actor, signal)
    return offer? offer.object.preferredUsername : null
  }

  async requestUsername(preferredUsername, signal=AbortSignal.timeout(500)) {
    // Check if we have already have made an offer
    let offer = null
    for await (const object of this.gf.objects(this.context, signal)) {
      if (this.#offerFilter(object)) {

        // Someone else already has the name!
        if (object.actor != this.gf.me &&
            object.object.preferredUsername == preferredUsername) {
          throw "Username already claimed!"
        }

        // An offer already exists!
        if (object.actor == this.gf.me) {
          if (!offer) {
            offer = object
          } else if (object.updated < offer.updated) {
            // Remove hanging offers if they exist
            this.gf.remove(offer)
            offer = object
          } else {
            this.gf.remove(object)
          }
        }
      }
    }

    // If an offer already exists, just change it
    if (offer) {
      offer.object.preferredUsername = preferredUsername
      return "success"
    }

    // Otherwise make a new one
    this.gf.post({
      type: 'Offer',
      object: {
        type: 'Profile',
        preferredUsername,
        actor: this.gf.me
      },
      target: {
        type: 'NameSystem',
        namespace: this.context
      },
      context: this.context
    })
    return "success"
  }

  async #resolveOffer(condition, signal) {
    let offer = null
    for await (const object of this.gf.objects(this.context, signal)) {
      if (this.#offerFilter(object) && condition(object)) {
        if (!offer) {
          offer = object
        } else if (object.updated < offer.updated) {
          offer = object
        }
      }
    }

    // If there is nothing accepted
    // just return an arbitrary offer if one exists
    return offer
  }

  // The target of offers and requests
  // {
  //    type: 'NameSystem'
  //    namespace: ['mycontext', ...]
  // }
  #targetFilter(t) {
    return t.type &&
           t.type == 'NameSystem' &&
           t.namespace &&
           Array.isArray(t.namespace) &&
           t.namespace.includes(this.context[0])
  }

  // The object of offers and requests
  // {
  //    type: 'Profile'
  //    preferredUsername: 'myuser',
  //    actor: 'graffitiactor://xyz'
  // }
  #objectFilter(o) {
    return o.actor &&
           typeof o.actor == 'string' &&
           o.type &&
           o.type == 'Profile' &&
           o.preferredUsername &&
           typeof o.preferredUsername == 'string'
  }

  // {
  //    type: 'Offer'
  //    target: {
  //      type: 'NameSpace'
  //      ...
  //    },
  //    object: {
  //      type: 'Profile',
  //      ...
  //    }
  // }
  #offerFilter(o) {
    return o.type &&
           o.type == 'Offer' &&
           o.target &&
           this.#targetFilter(o.target) &&
           o.object &&
           this.#objectFilter(o.object)
  }
}
