import {css, html, LitElement} from "lit";
import {property, query} from "lit/decorators.js";
import { contextProvided } from "@lit-labs/context";
import {sharedStyles} from "../sharedStyles";
import {Unit, DocType, howContext, Document, DocumentOutput, SysState, Progress} from "../types";
import {HowStore} from "../how.store";
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import { StoreSubscriber } from "lit-svelte-stores";
import {unsafeHTML} from "lit/directives/unsafe-html.js";

const angleInRadians = (angleInDegrees: number) => (angleInDegrees - 90) * (Math.PI / 180.0);

const polarToCartesian = (centerX:number, centerY:number, radius:number, angleInDegrees:number) => {
    const a = angleInRadians(angleInDegrees);
    return {
        x: centerX + (radius * Math.cos(a)),
        y: centerY + (radius * Math.sin(a)),
    };
};

const arc = (x:number, y:number, radius:number, startAngle:number, endAngle:number) => {
    const fullCircle = endAngle - startAngle === 360;
    const start = polarToCartesian(x, y, radius, endAngle - 0.01);
    const end = polarToCartesian(x, y, radius, startAngle);
    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    const d = [
        'M', start.x, start.y,
        'A', radius, radius, 0, arcSweep, 0, end.x, end.y,
    ];

    if (fullCircle) d.push('z');
    return d.join(' ');
};

interface Segment {
    title: string;
    color: string;
    opacity?: string;
    start: number;
    end: number;
}
const COLORS = {"define":"#65DAD2", "refine":"#9F4EE8", align:"#402ADA"}
const ORDER = ['define', 'refine', 'align','_alive']
/**
 * @element how-node
 */
export class HowNode extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }
  @property() unit:Unit|undefined;
  @property() state:string = "";
  @property() progress:Progress| undefined = undefined;

  @contextProvided({ context: howContext })
  _store!: HowStore;

  circle(segments: Array<Segment>, cross?: boolean) {
    const width = 200
    const x = width/2
    const y = width/2
    const r = x*.75
    const svg = `
    <svg style="fill:none; stroke-width:30" width="100%" height="100%" viewbox="0 0 ${width} ${width}">
        ${segments.map((segment,i) => {
            return `<path style="stroke:${segment.color}";${segment.opacity?` stroke-opacity="${segment.opacity}"`:""} d=" ${arc(x,y,r,segment.start,segment.end)}"><title>${segment.title}</title></path>`
        }).join('')}
        ${cross ? '<path style="stroke:black; stroke-width:30" d=" M 40 40 l 120 120">' : ''}
    </svg>
    `
    return unsafeHTML(svg)
  }
  
  render() {
    if (!this.unit) {
      return;
    }
    if (this.state == SysState.Defunct) {
      return html`
      ${this.circle([
          {title:"Defunct", color:"#0c0c2e", start:0, end:360},
      ], true)}    
      `
  } else if (this.state) {
        const segments = []
        let i = 0;
        const sweep = 360/this.unit.processes.length
        const stateIndex = ORDER.indexOf(this.state)

        let currentState = ""
        let opacity = ""
        for (const [procType, procName] of this.unit.processes) {
            //const path = `${procType}.${procName}`
            const elems = procType.split(".")
            const typeName = elems[elems.length-1]
            //@ts-ignore
            const color: string = i > stateIndex ? "#ccc" : COLORS[typeName]
            if (this.state == typeName) {
                currentState = procName
                const start = sweep*i+.75
                const end = sweep*(i+1)-.75
                const len = end - start

                if (this.progress) {
                  const seg = len/this.progress.total
                  const progressText = `${procName}: ${this.progress.count} of ${this.progress.total}`

                  segments.push({title: progressText, color, start, end:start+ seg*this.progress.count })
                  segments.push({title: progressText, color:"#ccc", start: start+ seg*this.progress.count, end })

                } else {
                  // create a gradient because we don't know the progress
                  const seg = len/100
                  let o = 100;
                  for (let j= start; j <= end; j+=seg) {
                    segments.push({title:procName, opacity:`${o}%`, color, start:j, end:j+seg})
                    o-=1
                  }  
                }
            } else {
              segments.push({title:procName, color, start:sweep*i+.75, end:sweep*(i+1)-.75})
            }
            i+=1
        }
        
        if (this.state == SysState.Alive) {
          return html`
            <img src=${aliveImage}>`
        } else {
          return html`
            <div class="circle">${this.circle(segments)}</div>
          `
        }
    } else {    
        return html`
        ${this.circle([
            {title:"Not Defined", color:"#ccc", start:0, end:360},
        ])}    
        `
    }
  }

  static get styles() {
    return [
      sharedStyles,
      css`
      img {
        width: 100%;
      }
      `,
    ];
  }
}

const aliveImage = "data:image/png;base64,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"
