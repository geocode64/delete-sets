import { Component, OnInit } from '@angular/core';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent implements OnInit {

  includesPublic: any[];
  deleteCount: number;

  constructor() { }

  ngOnInit(): void {
  }

}
