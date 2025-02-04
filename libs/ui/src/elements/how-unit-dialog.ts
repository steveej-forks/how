import {css, html, LitElement} from "lit";
import {property, query, state} from "lit/decorators.js";

import {sharedStyles} from "../sharedStyles";
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {HowStore} from "../how.store";
import {Unit, howContext, Dictionary, Node, VersioningType} from "../types";
import {EntryHashB64} from "@holochain/client";
import {
  Button,
  Dialog,
  TextField,
  TextArea,
  Select,
  ListItem,
} from "@scoped-elements/material-web";
import {SearchAgent} from "@holochain-open-dev/profiles";
import { StoreSubscriber } from "lit-svelte-stores";
import { consume } from '@lit-labs/context';

const PROCESS_TYPES = ['define', 'refine', 'align'] as const;
type ProcessType = typeof PROCESS_TYPES[number];

/**
 * @element how-unit-dialog
 */
export class HowUnitDialog extends ScopedElementsMixin(LitElement) {

  /** Dependencies */
  @consume({ context: howContext, subscribe: true })
  _store!: HowStore;

  @query('#name-field')
  _nameField!: TextField;

  @query('#version-field')
  _versionField!: TextField;

  @query('#versioning-type-select')
  _versioningTypeSelect!: Select;

  @query('#title-field')
  _titleField!: TextField;

  @query('#align-process-select')
  _alignProcessSelect!: Select;

  @query('#define-process-select')
  _defineProcessSelect!: Select;

  @query('#refine-process-select')
  _refineProcessSelect!: Select;
  
  @property() _stewards: Dictionary<string> = {};

  @state() _parent?: Unit;

  private static readonly NONE = 'none'; // we need a default value for the mwc-selects because if an empty string is provided, the UI gets broken
  private static readonly PROCESS_PATH = 'soc_proto.process';

  private _processes: Dictionary<StoreSubscriber<Node[]>> = {
    align: new StoreSubscriber(this, () => this._store.alignProcesses),
    define: new StoreSubscriber(this, () => this._store.defineProcesses),
    refine: new StoreSubscriber(this, () => this._store.refineProcesses)
  };

  private takenNames: Array<string> = []
  /**
   *
   */

  firstUpdated() {
    this._nameField.validityTransform = (newValue: string) => {
      this.requestUpdate();
      if (this.takenNames.includes(this._nameField.value)) {
        this._nameField.setCustomValidity(`Path abbreviation already exists`);
        return {
          valid: false,
        };
      } 

      return {
        valid: true,
      };
    };
  }
  open(parentEh: EntryHashB64) {
    this._parent = this._store.unit(parentEh);
    const dialog = this.shadowRoot!.getElementById("unit-dialog") as Dialog
    dialog.open = true
  }

  private getProcessSelect(type: ProcessType) {
    const selects = {
      align: this._alignProcessSelect,
      define: this._defineProcessSelect,
      refine: this._refineProcessSelect
    }

    return selects[type]
  }

  private getProcessesValue(): [string, string][] {
    const processes = PROCESS_TYPES
      .map((processType: ProcessType) => {
        const { value } = this.getProcessSelect(processType)

        return value !== HowUnitDialog.NONE ? [`${HowUnitDialog.PROCESS_PATH}.${processType}`, value] : null
      })
      .filter(process => !!process)

    return (processes.length ? processes : [['', '']]) as [string, string][]
  }

  /**
   *
   */
  private async handleOk(e: any) {
    /** Check validity */
    // nameField
    let isValid = this._nameField.validity.valid
    if (!this._nameField.validity.valid) {
      this._nameField.reportValidity()
    }
    if (!this._titleField.validity.valid) {
      this._titleField.reportValidity()
    }
    if (!this._versionField.validity.valid) {
      this._versionField.reportValidity()
    }

    const processes = this.getProcessesValue()
    const stewards = Object.keys(this._stewards).map((agent)=> agent)
    if (stewards.length == 0) {
      stewards.push(this._store.myAgentPubKey)
    }
    const unit = new Unit({
      parents: [this.parentPath()], // full paths to parent nodes (remember it's a DAG)
      version: `${this._versioningTypeSelect.value}${this._versionField.value}`, // max 100 chars
      pathAbbreviation: this._nameField.value, // max 10 char
      shortName: this._titleField.value,
      stewards,  // people who can change this document
      processes,
      });

    // - Add unit to commons
    const newUnit = await this._store.addUnit(unit);
    this.dispatchEvent(new CustomEvent('unit-added', { detail: newUnit, bubbles: true, composed: true }));

    // - Clear all fields
    // this.resetAllFields();
    // - Close dialog
    const dialog = this.shadowRoot!.getElementById("unit-dialog") as Dialog;
    dialog.close()
  }

  resetAllFields() {
    this._parent = undefined
    this._nameField.value = ''
    this._titleField.value = ''
    this._alignProcessSelect.value = HowUnitDialog.NONE
    this._defineProcessSelect.value = HowUnitDialog.NONE
    this._refineProcessSelect.value = HowUnitDialog.NONE
    this._stewards = {}
  }

  private async handleDialogOpened(e: any) {
    // if (false) {
    //   const unit = this._store.unit(this._unitToPreload);
    //   if (unit) {
        
    //   }
    //   this._unitToPreload = undefined;
    // }
   // this.requestUpdate()
  }

  private async handleDialogClosing(e: any) {
    this.resetAllFields();
  }

  private parentPath() {
    if (!this._parent) return ``
    let path = ""
    if (this._parent.parents.length > 0) path +=  `${this._parent?.parents[0]}.`
    path += this._parent?.pathAbbreviation
    return path
  }

  private addSteward(e:any) {
    const nickname = e.detail.agent.profile.nickname
    const pubKey = e.detail.agent.agent_pub_key
    this._stewards[pubKey] = nickname
    this._stewards = this._stewards
    this.requestUpdate()
  }

  render() {
    return html`
<mwc-dialog id="unit-dialog" heading="New unit" @closing=${this.handleDialogClosing} @opened=${this.handleDialogOpened}>
  Parent: ${this.parentPath()}
  <mwc-textfield dialogInitialFocus type="text"
                 @input=${() => (this.shadowRoot!.getElementById("name-field") as TextField).reportValidity()}
                 id="name-field" minlength="3" maxlength="64" label="Path Abbreviation" autoValidate=true required></mwc-textfield>
  <mwc-select
        id="versioning-type-select" 
        label="Select version type" 
        @closing=${(e: any) => e.stopPropagation()}
      >
        <mwc-list-item selected value=${VersioningType.Semantic}>Semantic</mwc-list-item>
        <mwc-list-item value=${VersioningType.Indexed}>Indexed</mwc-list-item>
  </mwc-select>
  <mwc-textfield type="text"
                 @input=${() => (this.shadowRoot!.getElementById("version-field") as TextField).reportValidity()}
                 id="version-field" minlength="1" maxlength="100" label="Version" autoValidate=true required></mwc-textfield>



  <mwc-textfield type="text"
                 @input=${() => (this.shadowRoot!.getElementById("title-field") as TextField).reportValidity()}
                 id="title-field" minlength="3" maxlength="64" label="Title" autoValidate=true required></mwc-textfield>
  
  ${PROCESS_TYPES.map(processType => 
    html`
      <mwc-select
        id="${processType}-process-select" 
        label="Select ${processType} process" 
        @closing=${(e: any) => e.stopPropagation()}
      >
        <mwc-list-item selected value=${HowUnitDialog.NONE}>
          &ltnone&gt
        </mwc-list-item>

        ${
          this._processes[processType].value.map((process) =>
            html`<mwc-list-item value=${process?.val.name}>${process?.val.name}</mwc-list-item>`
          )
        }
      </mwc-select>
    `
  )}
  
  Stewards: ${Object.keys(this._stewards).length} ${Object.entries(this._stewards).map(([agent, nickname])=>html`<span class="agent" title="${agent}">${nickname}</span>`)}
  <search-agent
  @closing=${(e:any)=>e.stopPropagation()}
  @agent-selected="${this.addSteward}"
  clear-on-select
  style="margin-bottom: 16px;"
  include-myself></search-agent>

  <mwc-button id="primary-action-button" slot="primaryAction" @click=${this.handleOk}>ok</mwc-button>
  <mwc-button slot="secondaryAction"  dialogAction="cancel">cancel</mwc-button>
</mwc-dialog>
`
  }


  static get scopedElements() {
    return {
      "mwc-button": Button,
      "mwc-dialog": Dialog,
      "mwc-textfield": TextField,
      "mwc-textarea": TextArea,
      "mwc-select": Select,
      "mwc-list-item": ListItem,
      "search-agent": SearchAgent,
    };
  }
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-dialog div {
          display: flex;
        }
        #unit-dialog {
          --mdc-dialog-min-width: 600px;
        }
        mwc-textfield {
          margin-top: 10px;
          display: flex;
        }
        mwc-textarea {
          margin-top: 10px;
          display: flex;
        }
        mwc-select {
          display: flex;
          margin: 10px 0;
        }
        .ui-item {
          position: absolute;
          pointer-events: none;
          text-align: center;
          flex-shrink: 0;
        }
`,
    ];
  }
}
