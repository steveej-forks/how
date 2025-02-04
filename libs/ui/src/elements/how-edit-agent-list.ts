import {css, html, LitElement} from "lit";
import {property, query, state} from "lit/decorators.js";

import {sharedStyles} from "../sharedStyles";
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import { AgentPubKeyB64, encodeHashToBase64 } from "@holochain/client";
import { HowAgentList } from "./how-agent-list";
/**
 * @element how-edit-agent-list
 */
export class HowEditAgentList extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }
  @property() agents : Array<AgentPubKeyB64> = []

  private addAgent(e:any) {
    //const nickname = e.detail.agent.profile.nickname
    const pubKey = encodeHashToBase64(e.detail.agentPubKey)
    if (!this.agents.includes(pubKey)) {
      this.agents.push(pubKey)
      const list = this.shadowRoot!.getElementById(`agent-list`) as HowAgentList
      list.requestUpdate()
    }
  }

  render() {
    return html`
      <div class="edit-agent-list column">
        <how-agent-list id="agent-list" layout="row" .agents=${this.agents}></how-agent-list>
        <search-agent
          @closing=${(e:any)=>e.stopPropagation()}
          @agent-selected="${this.addAgent}"
          clear-on-select
          style="margin-bottom: 16px;"
          include-myself></search-agent>
        </div>
      `
  }
  static get scopedElements() {
    return {
      'how-agent-list': HowAgentList,
    };
  }
static get styles() {
    return [
      sharedStyles,
      css`
         .edit-agent-list {

         }
      `,
    ];
  }
}
