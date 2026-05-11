/*
 * Copyright 2025 Silkwood Software Pty. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, OnInit, Input, Injector } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CsvFormChainService } from '../../services/csv-form-chain.service';
import { CsvFormNavigationService } from '../../services/csv-form-navigation.service';

@Component({
  selector: 'app-chain-navigation',
  templateUrl: './chain-navigation.component.html',
  styleUrls: ['./chain-navigation.component.scss']
})
export class ChainNavigationComponent implements OnInit {
  @Input() getData: () => Record<string, any> = () => ({});
  
  isPartOfChain = false;
  chainId: string | null = null;
  linkId: number | null = null;
  hasNextLink = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private injector: Injector
  ) {}

  ngOnInit() {
    // Check if this component is part of a chain
    this.route.queryParams.subscribe(params => {
      this.isPartOfChain = params['isChain'] === 'true';
      this.chainId = params['chainId'];
      this.linkId = params['linkId'] ? parseInt(params['linkId'], 10) : null;
      
      // Check if there's a next link in the chain
      if (this.isPartOfChain && this.chainId && this.linkId !== null) {
        const chainService = this.injector.get(CsvFormChainService);
        chainService.getNextLink(this.chainId, this.linkId).then(nextLink => {
          this.hasNextLink = !!nextLink;
        });
      }
    });
  }

  continueChain() {
    if (this.chainId && this.linkId !== null) {
      // Get the chain service
      const chainService = this.injector.get(CsvFormChainService);
      const navigationService = this.injector.get(CsvFormNavigationService);
      
      // Get the next link in the chain
      chainService.getNextLink(this.chainId, this.linkId).then(nextLink => {
        if (nextLink) {
          // Set up the navigation state
          const navigationState = navigationService.getNavigationState();
          navigationState.currentChain = {
            chainId: this.chainId!,
            currentLinkId: this.linkId!,
            data: this.getData() // Get the data from the parent component
          };
          
          // Execute the next link
          navigationService['executeChainLink'](nextLink);
        } else {
          // Chain is complete
          console.log('Chain execution complete');
          this.router.navigate(['/']);
        }
      }).catch(error => {
        console.error('Error getting next chain link:', error);
        this.router.navigate(['/']);
      });
    }
  }

  cancelChain() {
    // Navigate back to the home page or another appropriate page
    this.router.navigate(['/']);
  }
}
