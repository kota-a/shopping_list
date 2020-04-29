/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const TICKET_STATE_OPEN = 1;
const TICKET_STATE_FIXED = 5;

var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
        init();
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        console.log('Received Event: ' + id);
    }
};

function init() {
    reloadItems();
    $('#trash').on('click', clickedTrash);
    $('#create').on('click', clickedCreate);
    $('#reload').on('click', clickedReload);
    $('#create_ok').on('click', clickedCreateOk);
    $('#create_cancel').on('click', clickedCreateCancel);
    $('#trash_confirm_ok').on('click', clickedTrashOk);
    $('#trash_confirm_cancel').on('click', clickedTrashCancel);
}

function clickedTrash( e ) {
    toDom($('#trash_confirm')).showModal();
}

function clickedTrashOk( e ) {
    $('.item').each( function( i, e ){
        if( $(e).find('.cb_item_state').prop('checked') == true ) {
            let item_id = e.id;
            
            // Update server
            deleteTicket( item_id );
            
            // Update display
            $('#' + item_id).remove();
        }
    });

    toDom($('#trash_confirm')).close();
}

function clickedTrashCancel( e ) {
    toDom($('#trash_confirm')).close();
}

function clickedCreate( e ) {
    $('#create_menu').val('new');
    
    let elem_item_name = $('#create_item_name');
    elem_item_name.val('');
    toDom(elem_item_name).focus();
    
    let elem_item_num = $('#create_item_num');
    elem_item_num.val('');
    
    $('#create_item_num').val('');
    toDom($('#create_menu')).showModal();
}

function clickedCreateOk( e ) {
    let create_item_name = $('#create_item_name').val();
    let create_item_num = $('#create_item_num').val();
    
    if( $('#create_menu').val() == 'new') {
        // Update server
        makeTicket( create_item_name, create_item_num );
    } else {
        let item_id = $('#create_menu').val();
        
        // Update server
        changeTicketData( item_id, create_item_name, create_item_num );
        
        //Update display
        let target_item = $('#' + item_id);
        target_item.find('.item_name').html( create_item_name );
        target_item.find('.item_num').html( create_item_num );
    }
    
    $('#create_menu').val('');
    toDom($('#create_menu')).close();
}

function clickedCreateCancel( e ) {
    $('#create_menu').val('');
    toDom($('#create_menu')).close();
}

function clickedReload( e ) {
    reloadItems();
}

function reloadItems() {
    let items = $('#items');
    let reloading_img = $('#reloading_img');
    
    // Clear items and display reloading image
    items.html('');
    items.css('display', 'none');
    reloading_img.css('display', 'block');
    
    let request_url = `${REDMINE.url}/projects/${REDMINE.project_name}/issues.json?key=${REDMINE.api_key}&status_id=*&limit=100&sort=id`;
    
    $.ajax({
        url: request_url,
        type: 'GET',
        dataType: 'json'
    }).done(function(data, status, xhr) {
        for(let issue of data.issues) {
            let item_num = issue.custom_fields.filter( function( item, index ) {
                if( item.id == REDMINE.custom_field_id.item_num ) return true;
            })[0].value;
            
            addItem( issue.id, issue.subject, item_num, issue.status.id );
        }

        reloading_img.css('display', 'none');
        items.css('display', 'block');
        items.scrollTop(0);
        
    }).fail(function(xhr, status, error) {
        console.log( {'xhr': xhr, 'status': status, 'error': error } );
        reloading_img.css('display', 'none');
        errorOccurred( `買い物情報取得エラー(${xhr.status})` );
    });
}

function addItem( item_id, item_name, item_num, item_state ) {
    let add_item = $('#item_template > .item').clone(false);

    add_item.attr('id', item_id);
    add_item.find('.cb_item_state').prop('checked', !(item_state == TICKET_STATE_OPEN));
    add_item.find('.cb_item_state_design').on('click', { item_id: item_id }, changeItemState);
    add_item.find('.item_body').on('click', { item_id: item_id }, clickItemBody);
    add_item.find('.item_name').html( item_name );
    add_item.find('.item_num').html( item_num );

    $('#items').append(add_item); 
}

function clickItemBody( e ) {
    let item_id = e.data.item_id;
    let target_item = $('#' + item_id);
    
    $('#create_menu').val(item_id);
    
    let elem_item_name = $('#create_item_name');
    elem_item_name.val(target_item.find('.item_name').html());
    toDom(elem_item_name).setSelectionRange(0, 0);
    toDom(elem_item_name).focus();
    
    let elem_item_num = $('#create_item_num');
    elem_item_num.val(target_item.find('.item_num').html());
    toDom(elem_item_num).setSelectionRange(0, 0);
    
    toDom($('#create_menu')).showModal();
}

function changeItemState( e ) {
    let item_id = e.data.item_id;
    let elem_checkbox = $('#' + item_id).find('.cb_item_state');
    let current_state = elem_checkbox.prop('checked');
    let new_state = !current_state;
    
    // Update display
    elem_checkbox.prop('checked', new_state);
    {
        /* 表示崩れ回避のための処理                                                                     */
        /* .item_name に style「overflow-x: scroll」を指定している場合、                                */
        /* チェックボックスの値を切り替えたときに .item_nameの左上に点が表示される（スクロールバー？）  */
        /* 原因不明だが、.item_nameの内容を更新すると消えるため、同じ内容を入れなおす                   */
        let elem_item_name = $('#' + item_id).find('.item_name');
        elem_item_name.html(elem_item_name.html());
    }
    
    // Update server
    let new_ticket_state = new_state ? TICKET_STATE_FIXED : TICKET_STATE_OPEN;
    changeTicketState( item_id, new_ticket_state );
}

function makeTicket( subject, num ) {
    let request_url = `${REDMINE.url}/issues.json?key=${REDMINE.api_key}`;
    
    ticket_data = {
        'issue': {
            'project_id': REDMINE.project_name,
            'subject': subject,
            'custom_fields': [
                { 'id': REDMINE.custom_field_id.item_num, 'value': num }
            ]
        }
    };
    
    $.ajax({
        url: request_url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(ticket_data),
        dataType: 'text'
    }).done(function(data, status, xhr) {
        reloadItems();
    }).fail(function(xhr, status, error) {
        console.log( {'xhr': xhr, 'status': status, 'error': error } );
        errorOccurred( `買い物情報追加エラー(${xhr.status})` );
    });
}

function changeTicketState( ticket_id, state ) {
    let request_url = `${REDMINE.url}/issues/${ticket_id}.json?key=${REDMINE.api_key}`;
    
    update_data = {
        'issue': {
            'status_id': state
        }
    };
    
    $.ajax({
        url: request_url,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(update_data),
        dataType: 'text'
    }).done(function(data, status, xhr) {
        // Do nothing
    }).fail(function(xhr, status, error) {
        console.log( {'xhr': xhr, 'status': status, 'error': error } );
        errorOccurred( `買い物情報ステータス更新エラー(${xhr.status})` );
    });
}

function changeTicketData( ticket_id, subject, num ) {
    let request_url = `${REDMINE.url}/issues/${ticket_id}.json?key=${REDMINE.api_key}`;
    
    update_data = {
        'issue': {
            'subject': subject,
            'custom_fields': [
                { 'id': REDMINE.custom_field_id.item_num, 'value': num }
            ]
        }
    };
    
    $.ajax({
        url: request_url,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(update_data),
        dataType: 'text'
    }).done(function(data, status, xhr) {
        // Do nothing
    }).fail(function(xhr, status, error) {
        console.log( {'xhr': xhr, 'status': status, 'error': error } );
        errorOccurred( `買い物情報データ更新エラー(${xhr.status})` );
    });
}

function deleteTicket( ticket_id ) {
    let request_url = `${REDMINE.url}/issues/${ticket_id}.json?key=${REDMINE.api_key}`;
    
    $.ajax({
        url: request_url,
        type: 'DELETE',
        dataType: 'text'
    }).done(function(data, status, xhr) {
        // Do nothing
    }).fail(function(xhr, status, error) {
        console.log( {'xhr': xhr, 'status': status, 'error': error } );
        errorOccurred( `買い物情報削除エラー(${xhr.status})` );
    });
}

function errorOccurred( message ) {
    alert( message );
    $('#items').html('');
}

function toDom( jquery_obj ) {
    return jquery_obj[0];
}

app.initialize();
