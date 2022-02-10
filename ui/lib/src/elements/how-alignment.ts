import {css, html, LitElement} from "lit";
import {property, query} from "lit/decorators.js";

import {contextProvided} from "@holochain-open-dev/context";
import {StoreSubscriber} from "lit-svelte-stores";

import {sharedStyles} from "../sharedStyles";
import {EntryHashB64, AgentPubKeyB64} from "@holochain-open-dev/core-types";
import {Alignment, howContext, STAUTS_COMPLETED} from "../types";
import {HowStore} from "../how.store";
import {HowDocumentDialog } from "./how-document-dialog";
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {ProfilesStore, profilesStoreContext,} from "@holochain-open-dev/profiles";
import {
  Button,
  Dialog,
  TextField,
  TextArea,
} from "@scoped-elements/material-web";

/**
 * @element how-alignment
 */
export class HowAlignment extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }

  @property() currentAlignmentEh = "";

  @contextProvided({ context: howContext })
  _store!: HowStore;

  @contextProvided({ context: profilesStoreContext })
  _profiles!: ProfilesStore;

  _myProfile = new StoreSubscriber(this, () => this._profiles.myProfile);
  _knownProfiles = new StoreSubscriber(this, () => this._profiles.knownProfiles);
  _alignments = new StoreSubscriber(this, () => this._store.alignments);
  _documents = new StoreSubscriber(this, () => this._store.documents);
  _documentPaths = new StoreSubscriber(this, () => this._store.documentPaths);

  @query('#document-dialog')
  _documentDialogElem!: HowDocumentDialog;

  get myNickName(): string {
    return this._myProfile.value.nickname;
  }

  handleNodelink(path: string) {
    console.log("clicked on", path)
    this.dispatchEvent(new CustomEvent('select-node', { detail: path, bubbles: true, composed: true }));
  }

  getPath() : string {
    if (!this.currentAlignmentEh) {
      return ""
    }
    const alignment: Alignment = this._alignments.value[this.currentAlignmentEh];
    return alignment.parents.length > 0 ? `${alignment.parents[0]}.${alignment.path_abbreviation}` : alignment.path_abbreviation
  }

  addDoc(document_type: string ) {
    this._documentDialogElem.new(this.getPath(), document_type);
  }

  openDoc(documentEh: EntryHashB64, editable: boolean ) {
    this._documentDialogElem.open(this.getPath(), documentEh, editable);
  }

  renderType(type: String, content: String) : String {
    return content
  }
  render() {
    if (!this.currentAlignmentEh) {
      return;
    }
    /** Get current alignment*/
    const alignment: Alignment = this._alignments.value[this.currentAlignmentEh]

    /** the list of documents for this alignment */
    const path = this.getPath()
    const docs = this._documentPaths.value[path]
    const documents = docs ? docs.map(doc => {
      const title = doc.content.getDocumentSection("title")
      return html`
      <ul class="document">
        ${title ? html`<div class="document-title">${this.renderType(title.content_type,title.content)}</div>` : ""}
        <div class="document-tye">${doc.content.document_type}</div>
        ${alignment.status == STAUTS_COMPLETED ? html`<mwc-button icon="visibility" @click=${()=>this.openDoc(doc.hash, false)}>View</mwc-button>` : html`<mwc-button icon="edit"  @click=${()=>this.openDoc(doc.hash, true)}>Edit</mwc-button>` }
        
      </ul>`
    }) : ""

    const processes = []
     for (const [procType, procName] of alignment.processes) {
        const path = `${procType}.${procName}`
        const elems = procType.split(".")
        const typeName = elems[elems.length-1]
        processes.push(html`<li>${typeName}: <span class="node-link" @click=${()=>this.handleNodelink(path)}>${procName}</span></li>`)
      }

    /** Render layout */
    return html`
      <div class="alignment">
       <li> Parents: ${alignment.parents.map((path) => html`<span class="node-link" @click=${()=>this.handleNodelink(path)}>${path}</span>`)}</li>
       <li> Path Abbrev: ${alignment.path_abbreviation}</li>
       <li> Name: ${alignment.short_name}</li>
       <li> Stewards: ${alignment.stewards.map((agent: string)=>html`<span class="agent" title="${agent}">${this._knownProfiles.value[agent].nickname}</span>`)}</li>
       <li> Status: ${alignment.status == STAUTS_COMPLETED ? "Completed" : alignment.processes[alignment.status][1]}
       ${processes}
       <li> Documents:
        ${documents} 
      </li>
      </div>
      <how-document-dialog id="document-dialog">
      </how-document-dialog>
    `;
  }


  static get scopedElements() {
    return {
      "mwc-button": Button,
      "how-document-dialog": HowDocumentDialog,
    };
  }
  static get styles() {
    return [
      sharedStyles,
      css`
      .alignment {
        border: solid .1em #666;
        border-radius: .2em;
        margin-left: 20px;
        padding: 10px;
      }
      .alignment h4 {
        margin-top: 0px;
        margin-bottom: 5px;
      }
      .alignment li {
        list-style: none;
        line-height: 1.5em;
      }
      .node-link {
        cursor: pointer;
        background-color: white;
        border: solid .1em #666;
        border-radius: .2em;
        padding: 0 6px 0 6px;
      }
      `,
    ];
  }
}
