/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ratasenlasparedesActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["ratasenlasparedes", "sheet", "actor"],
      template: "systems/ratasenlasparedes/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = foundry.utils.deepClone(super.getData().data);
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.system.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }

    // Prepare items.
    if (this.actor.type == 'character') {
      this._prepareCharacterItems(data);
    }

    data.enrichedBio = await TextEditor.enrichHTML(this.object.system.biography, {async: true})

    return data;
  }
  
  activateEditor(name, options, initialContent) {//TODO: Custom editor
    // remove some controls to the editor as the space is lacking
      // console.log(name);
      // console.log(options);
      // console.log(initialContent);
    if (name == "system.biography") {
      /*options.toolbar = "styleselect bullist hr table removeFormat save";*/
    } 
    super.activateEditor(name, options, initialContent);
  }




  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    //html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-create').click(ev => this._onItemCreate(ev));
    
    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getEmbeddedDocument("Item",li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteEmbeddedDocuments("Item",[li.data("itemId")]);
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));
    
    // profesion show.
    html.find('.profesion').click( ev => {
     const profesion = this.actor.items.find(i => i.type == "profesion");
     if(profesion){
         const item = this.actor.getEmbeddedDocument("Item",[profesion._id]);
         item.sheet.render(true);
     }
    });
    // profesion show.
    html.find('.reputation').click( ev => {
     const reputation = this.actor.items.find(i => i.type == "reputation");
     if(reputation){
         const item = this.actor.getEmbeddedDocument("Item",[reputation._id]);
         item.sheet.render(true);
     }
    });
    
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createEmbeddedDocuments("Item",[itemData]);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const rollType = dataset.rollType;
    let difficulty = ["0", ""];
    let rollString = "";
    
      if (event.ctrlKey)
        //alert('Ctrl down');
        difficulty = ["-2", "difícil"];
        
      if (event.shiftKey)
        //alert('Alt down');
        difficulty = ["+2", "fácil"];
    
    
    if (rollType == "ability"){
        if (dataset.roll) {
            if (difficulty[0] != "0") {
                rollString = dataset.roll + ' ' + difficulty[0];
            }else{
                rollString = dataset.roll;
            }
            let roll = new Roll(rollString, this.actor.system);
            let label = dataset.label ? `Realiza una tirada <strong>${difficulty[1]}</strong> de <strong>${dataset.label}</strong>` : '';
            roll.async = true;
            let rollResult = await roll.roll({async: true});
            
            let messageData = {
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flags: {'ratasenlasparedes':{'text':label, 'detail': rollResult.result}},
                    flavor: label,
                };
            
               rollResult.toMessage(messageData); 
 
        }
    }
    
    if (rollType == "weapon") {
        let difficultyString = "";
        if (dataset.roll) {
            if (difficulty[0] != "0") {
                rollString = dataset.roll + ' ' + difficulty[0];
                difficultyString = ` en una situación <strong>${difficulty[1]}</strong>`;
            } else {
                rollString = dataset.roll;
            }
            let roll = new Roll(rollString, this.actor.data.data);
            let damageRoll = new Roll(dataset.damage, this.actor.system);
            let label = dataset.label ? `Usa su <strong>${dataset.label}</strong> ${difficultyString}.` : '';
            let attackResult = await roll.roll();
            let goal;

            if (attackResult._total <= 7){ /*@Compendium[ratasenlasparedes.ayudas.8eZa50wvErHt4ONd]{Consecuencias}*/
                label += ` <strong>Falla</strong> y sufre <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> dos Consecuencias}</a>.`;
                goal = "Fallo";
            } else if (attackResult._total <= 9){
                label += ` Tiene <strong>éxito</strong>, pero sufre <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> una Consecuencia</a>`;
                goal = "Parcial";
            } else if (attackResult._total <= 11){
                label += ` Tiene <strong>éxito</strong> y elige <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> una Consecuencia</a> para su objetivo.`;
                goal = "Exito";
            } else {
                label += ` Tiene <strong>éxito</strong> y elige <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> dos Consecuencias</a> para su objetvo.`;
                goal = "!Oh sí!";
            }
            
            let attackData = {
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flags: {'ratasenlasparedes':{'text':label, 'goal':goal, 'detail': attackResult.result}},
                flavor: label,
            };
            
            attackResult.toMessage(attackData);

        }
    }
    
    if (rollType == "damage") {
        if (dataset.roll) {
            let damageMod = Array.from(this.actor.data.items).reduce(function (acu, current) {
                                if (current.data.data.type == "Efecto" && current.data.data.value == "Daño") {
                                    acu += parseInt(current.data.data.mod);
                                }
                                return acu;
                            }, 0);
//            console.log("Modificador al daño: " + damageMod);
//            console.log(dataset);
            damageMod == 0 ? rollString = dataset.roll : rollString = dataset.roll + " + (" + damageMod + ")"; 
            
            let roll = new Roll(rollString);
            let label = dataset.label ? `Causa daño con su <strong>${dataset.label}</strong>.` : '';
            let attackResult = await roll.roll();
            //let damageResult = damageRoll.roll();
//             let showDamage = false;
            let goal;
            //let rolls = attackResult.terms[0].results.reduce((a, b) => a + ' + ' + b); console.log(rolls);
            // console.log(attackResult);
//            console.log(attackResult.terms);
            let attackData = {
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flags: {'ratasenlasparedes':{'text':label, 'goal':goal}},
                flavor: label,
            };
                
            attackResult.toMessage(attackData);
            
        }
    }

    if (rollType == "sanity") {
        const dialogOptions = {
            width: 420,
            top: event.clientY - 80,
            left: window.innerWidth - 710,
            classes: ['dialog', 'ratas-dice-roller'],
        };
        let templateData = {
            title: 'Lanzador',
            rollClass: 'ratas-sanity-check',
            actorId: this.actor._id
        };
        // Render the modal.
      renderTemplate('systems/ratasenlasparedes/templates/roller.html', templateData).then(dlg => {
        new Dialog({
          title: 'Perdida de Cordura',
          content: dlg,
          buttons: {
            close: {
              label: 'Cerrar',
              callback: () => console.log("Cerrado ratas-simple-dice-roller")
            }
          }
        }, dialogOptions).render(true);
      });
    }
  }
  
  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData;
console.log(sheetData);
    // Initialize containers.
    const gear = [];
    const profesion = [];
    const reputation = [];
    const weapon = [];
    const scar = [];
    const mean = [];
    const spell = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to profesion.
      else if (i.type === 'profesion') {
        profesion.push(i);
      }
      // Append to reputation.
      else if (i.type === 'reputation') {
        reputation.push(i);
      }
      // Append to weapons.
      else if (i.type === 'weapon') {
        weapon.push(i);
      }
      // Append to scar.
      else if (i.type === 'scar') {
        scar.push(i);
      }
      // Append to mean.
      else if (i.type === 'mean') {
        mean.push(i);
      }
      // Append to spell.
      else if (i.type === 'spell') {
        spell.push(i);
      }
    }

    // Assign and return
    actorData.gear = gear;
    actorData.profesion = profesion;
    actorData.reputation = reputation;
    actorData.weapon = weapon;
    actorData.scar = scar;
    actorData.mean = mean;
    actorData.spell = spell;
  }

}
