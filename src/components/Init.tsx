"use server-entry";

import { type FunctionComponent } from 'react';

type Props = {};

export const Init: FunctionComponent<Props> = () => (
  <div x-data="{ contentDir: undefined }" x-effect="if (contentDir) document.cookie=`contentDir=${window.btoa(contentDir)}; path=/;`" >
    <label className="input">
      <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></g></svg>
      <input 
        type="text" 
        className="grow" 
        placeholder="~/my_notes_folder" 
        {...{
          "x-bind:value": "contentDir",
          "x-on:input.debounce": "event => contentDir = event.target.value",
          "x-on:keyup.enter": "if (contentDir) window.location.reload()"
        }}
      />
    </label>
  </div>
)

